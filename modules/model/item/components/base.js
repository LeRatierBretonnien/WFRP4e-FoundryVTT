
 export class BaseItemModel extends foundry.abstract.DataModel 
 {
 
    //  allowedConditions = [];  // What condition effects can exist on the item
    //  allowedEffectApplications = Object.keys(game.wfrp4e.config.effectApplications);
    //  effectApplicationOptions = {};
 
 
     get id () 
     {
         return this.parent.id;
     }
 
     static defineSchema() 
     {
        return {
            description : fields.SchemaField({
                value: new fields.StringField()
            }),
            gmdescription : fields.SchemaField({
                value: new fields.StringField()
            }),
        } 
     }
 
     allowCreation()
     {
         if (this.parent.actor)
         {
             return this.parent.actor.system.itemIsAllowed(this.parent);
         }
         else 
         {
             return true;
         }
     }
 

     // *** Creation ***
     async preCreateData(data, options, user)
     {
        let preCreateData = {};
        if (!data.img || data.img == "icons/svg/item-bag.svg")
            preCreateData.img = "systems/wfrp4e/icons/blank.png";

        return preCreateData;
     }

     async createChecks()
     {
         
     }

     // *** Updates *** 
     async preUpdateChecks(data)
     {
         return data;
     }
 
     async updateChecks()
     {
         if (this.parent.actor)
         {
             this.parent.actor.update(this.parent.actor.system.updateChecks({}, {}));
         }
 
         return {};
     }


     // *** Deletions ***
     async preDeleteChecks()
     {

     }

     async deleteChecks() 
     {

     }




 
    /**
      * @abstract
      */
     computeBase() 
     {

     }
 
    /**
      * @abstract
      */
     computeDerived() 
     {

     }

     /**
      * @abstract
      */
     computeOwned()
     {
     }


    get skillToUse() {
        return this.getSkillToUse(this.actor)
    }

  /**
   * Sometimes a weapon isn't being used by its owning actor (namely: vehicles)
   * So the simple getter BaseItemModel#skillToUse isn't sufficient, we need to provide
   * an actor to use their skills instead
   * 
   * @abstract
   * @param {Object} actor Actor whose skills are being used
   */
    getSkillToUse(actor)
    {
        
    }


    async expandData(htmlOptions) {
        htmlOptions.async = true;
        const data = this.parent.toObject().system;
        data.properties = [];
        data.description.value = data.description.value || "";
        data.description.value = await TextEditor.enrichHTML(data.description.value, htmlOptions);
        data.targetEffects = this.parent.effects.filter(e => e.application == "apply")
        data.invokeEffects = this.parent.effects.filter(e => e.trigger == "invoke")
        return data;
      }

    /**
     * @abstract
     */
    chatData()
    {
        
    }
 
    //  computeOwnerDerived() 
    //  {
         
    //  }
 
    //  computeOwnerBase() 
    //  {

    //  }
 
     /**
      * 
      */
    //  effectIsApplicable(effect)
    //  {
    //      return !effect.disabled;
    //  }
 
    //  // If an item effect is disabled it should still transfer to the actor, so that it's visibly disabled
    //  shouldTransferEffect(effect)
    //  {
    //      return true;
    //  }
 
 }