export default class Migration {

  async migrateWorld() {
    ui.notifications.info(`Applying WFRP4e System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

    // Migrate World Items
    for (let i of game.items.contents) {
      try {
        const updateData = this.migrateItemData(i.toObject());
        if (!foundry.utils.isObjectEmpty(updateData)) {
          console.log(`Migrating Item documment ${i.name}`);
          await i.update(updateData, { enforceTypes: false });
        }
      } catch (err) {
        err.message = `Failed wfrp4e system migration for Item ${i.name}: ${err.message}`;
        console.error(err);
      }
    }

    for (let p of game.packs) {
      if (p.metadata.type == "Item" && p.metadata.package == "world")
        await this.migrateCompendium(p);
    }
    for (let p of game.packs) {
      if (p.metadata.type == "Actor" && p.metadata.package == "world")
        await this.migrateCompendium(p);
    }
    for (let p of game.packs) {
      if (p.metadata.type == "Scene" && p.metadata.package == "world")
        await this.migrateCompendium(p);
    }

    // Migrate World Actors
    for (let a of game.actors.contents) {
      try {
        const updateData = this.migrateActorData(a.data);
        if (!foundry.utils.isObjectEmpty(updateData)) {
          console.log(`Migrating Actor documment ${a.name}`);
          await a.update(updateData, { enforceTypes: false });
          await this.migrateOwnedItemEffects(a)
        }
      } catch (err) {
        err.message = `Failed wfrp4e system migration for Actor ${a.name}: ${err.message}`;
        console.error(err);
      }
    }

    // Migrate Actor Override Tokens
    for (let s of game.scenes.contents) {
      try {
        const updateData = this.migrateSceneData(s.data);
        if (!foundry.utils.isObjectEmpty(updateData)) {
          console.log(`Migrating Scene documment ${s.name}`);
          await s.update(updateData, { enforceTypes: false });
          // If we do not do this, then synthetic token actors remain in cache
          // with the un-updated actorData.
          s.tokens.contents.forEach(t => t._actor = null);
        }
      } catch (err) {
        err.message = `Failed wfrp4e system migration for Scene ${s.name}: ${err.message}`;
        console.error(err);
      }
    }

    // // Set the migration as complete
    game.settings.set("wfrp4e", "systemMigrationVersion", game.system.version);
    ui.notifications.info(`wfrp4e System Migration to version ${game.system.version} completed!`, { permanent: true });
  };

  /* -------------------------------------------- */

  /**
   * Apply migration rules to all Entities within a single Compendium pack
   * @param pack
   * @return {Promise}
   */
  async migrateCompendium(pack) {
    const document = pack.metadata.document;
    if (!["Actor", "Item", "Scene"].includes(document)) return;

    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });

    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate();
    const documents = await pack.getDocuments();

    // Iterate over compendium entries - applying fine-tuned migration functions
    for (let doc of documents) {
      let updateData = {};
      try {
        switch (document) {
          case "Actor":
            updateData = this.migrateActorData(doc.data);
            break;
          case "Item":
            updateData = this.migrateItemData(doc.toObject());
            break;
          case "Scene":
            updateData = this.migrateSceneData(doc.data);
            break;
        }

        // Save the entry, if data was changed
        if (foundry.utils.isObjectEmpty(updateData)) continue;
        await doc.update(updateData);
        console.log(`Migrated ${document} document ${doc.name} in Compendium ${pack.collection}`);
      }

      // Handle migration failures
      catch (err) {
        err.message = `Failed wfrp4e system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
        console.error(err);
      }
    }

    // Apply the original locked status for the pack
    await pack.configure({ locked: wasLocked });
    console.log(`Migrated all ${document} entities from Compendium ${pack.collection}`);
  };

  /* -------------------------------------------- */
  /*  Entity Type Migration Helpers               */
  /* -------------------------------------------- */

  /**
   * Migrate a single Actor entity to incorporate latest data model changes
   * Return an Object of updateData to be applied
   * @param {object} actor    The actor data object to update
   * @return {Object}         The updateData to apply
   */
  migrateActorData(actor) {
    const updateData = {};

    // Actor Data Updates
    if (actor.data) {
      updateData["system.characteristics.ws.-=career"] = null
      updateData["system.characteristics.bs.-=career"] = null
      updateData["system.characteristics.s.-=career"] = null
      updateData["system.characteristics.t.-=career"] = null
      updateData["system.characteristics.i.-=career"] = null
      updateData["system.characteristics.ag.-=career"] = null
      updateData["system.characteristics.dex.-=career"] = null
      updateData["system.characteristics.int.-=career"] = null
      updateData["system.characteristics.wp.-=career"] = null
      updateData["system.characteristics.fel.-=career"] = null
    }

    // Migrate Owned Items
    if (actor.items) {
      const items = actor.items.reduce((arr, i) => {
        // Migrate the Owned Item
        const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
        let itemUpdate = this.migrateItemData(itemData);

        // Update the Owned Item
        if (!isObjectEmpty(itemUpdate)) {
          itemUpdate._id = itemData._id;
          arr.push(expandObject(itemUpdate));
        }

        return arr;
      }, []);
      if (items.length > 0) updateData.items = items;

    }

    // Migrate Effects
    if (actor.actorEffects) {
      const effects = actor.actorEffects.reduce((arr, e) => {
        // Migrate the Owned Item
        const effectData = e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
        let effectUpdate = this.migrateEffectData(effectData);

        // Update the Owned Item
        if (!isObjectEmpty(effectUpdate)) {
          effectUpdate._id = effectData._id;
          arr.push(expandObject(effectUpdate));
        }

        return arr;
      }, []);
      if (effects.length > 0) updateData.effects = effects;
    }
    return updateData;
  };

  /**
 * Migrate a single Actor entity to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
  async migrateOwnedItemEffects(actor) {

    let itemsToRemove = [];

    let itemsToAdd = [];

    for (let item of actor.items) {
      if (item.getFlag("core", "sourceId")) {
        let source = item.getFlag("core", "sourceId")
        let newItem = item.toObject();
        let sourceItem = await fromUuid(source)
        if (sourceItem)
          sourceItem = sourceItem.toObject();

        if (sourceItem.name == item.name) {
          newItem.effects = sourceItem.effects
          itemsToRemove.push(item.id)
          itemsToAdd.push(newItem);
        }
      }
    }

    await actor.deleteEmbeddedDocuments("Item", itemsToRemove)
    await actor.createEmbeddedDocuments("Item", itemsToAdd, { keepId: true })

    console.log(`Replaced Items ${itemsToAdd.map(i => i.name).join(", ")} for actor ${actor.name}`)
  };


  /* -------------------------------------------- */


  /**
   * Scrub an Actor's system data, removing all keys which are not explicitly defined in the system template
   * @param {Object} actorData    The data object for an Actor
   * @return {Object}             The scrubbed Actor data
   */
  cleanActorData(actorData) {

    // Scrub system data
    const model = game.system.model.Actor[actorData.type];
    actorData.data = filterObject(actorData.data, model);

    // Scrub system flags
    const allowedFlags = CONFIG.wfrp4e.allowedActorFlags.reduce((obj, f) => {
      obj[f] = null;
      return obj;
    }, {});
    if (actorData.flags.wfrp4e) {
      actorData.flags.wfrp4e = filterObject(actorData.flags.wfrp4e, allowedFlags);
    }

    // Return the scrubbed data
    return actorData;
  }


/* -------------------------------------------- */

  /**
   * Migrate a single Item entity to incorporate latest data model changes
   *
   * @param {object} item  Item data to migrate
   * @return {object}      The updateData to apply
   */
   migrateArmourData(item) {
    const updateData = {};

    if (item.type == "armour") {
      updateData["system.AP"] = duplicate(item.system.maxAP)
      updateData["system.APdamage"] = duplicate(item.system.currentAP)

      for(let loc in item.system.currentAP)
      {
        if(item.system.currentAP[loc] == -1)
          updateData["system.APdamage"][loc] == item.system.maxAP[loc]
        else {
          updateData["system.APdamage"][loc] == item.system.maxAP[loc] - item.system.currentAP[loc]
        }
      }
    }

    return updateData;
  };

  /**
   * Migrate a single Item entity to incorporate latest data model changes
   *
   * @param {object} item  Item data to migrate
   * @return {object}      The updateData to apply
   */
  migrateItemData(item) {
    const updateData = {};

    if (item.type == "armour")
    {
      updateData = this.migrateArmourData(item);
    }
    
    // Migrate Effects
    if (item.effects) {
      const effects = item.effects.reduce((arr, e) => {
        // Migrate the Owned Item
        const effectData = e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
        let effectUpdate = this.migrateEffectData(effectData);

        // Update the Owned Item
        if (!isObjectEmpty(effectUpdate)) {
          effectUpdate._id = effectData._id;
          arr.push(expandObject(effectUpdate));
        }

        return arr;
      }, []);
      if (effects.length > 0) updateData.effects = effects;
    }

    this._migrateItemProperties(item, updateData);
    return updateData;
  };

  /* -------------------------------------------- */

  /**
   * Migrate a single Effect entity to incorporate latest data model changes
   *
   * @param {object} effect Effect data to migrate
   * @return {object}      The updateData to apply
   */
  migrateEffectData(effect) {
    const updateData = {};
    //this._migrateEffectScript(effect, updateData)
    return updateData;
  };

  /* -------------------------------------------- */

  /**
   * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
   * Return an Object of updateData to be applied
   * @param {Object} scene  The Scene data to Update
   * @return {Object}       The updateData to apply
   */
  migrateSceneData(scene) {
    const tokens = scene.tokens.map(token => {
      const t = token.toJSON();
      if (!t.actorId || t.actorLink) {
        t.actorData = {};
      }
      else if (!game.actors.has(t.actorId)) {
        t.actorId = null;
        t.actorData = {};
      }
      else if (!t.actorLink) {
        const actorData = duplicate(t.actorData);
        actorData.type = token.actor?.type;
        const update = this.migrateActorData(actorData);
        ['items', 'effects'].forEach(embeddedName => {
          if (!update[embeddedName]?.length) return;
          const updates = new Map(update[embeddedName].map(u => [u._id, u]));
          t.actorData[embeddedName].forEach(original => {
            const update = updates.get(original._id);
            if (update) mergeObject(original, update);
          });
          delete update[embeddedName];
        });

        mergeObject(t.actorData, update);
      }
      return t;
    });
    return { tokens };
  };

  /* -------------------------------------------- */
  /*  Low level migration utilities
  /* -------------------------------------------- */




  _migrateEffectScript(effect, updateData) {
    let script = getProperty(effect, "flags.wfrp4e.script")

    if (effect.origin && effect.origin.includes("OwnedItem"))
      updateData["origin"] = effect.origin.replace("OwnedItem", "Item")

    if (!script)
      return updateData


    if (script != getProperty(effect, "flags.wfrp4e.script"))
      updateData["flags.wfrp4e.script"] = script

    return updateData
  }

}