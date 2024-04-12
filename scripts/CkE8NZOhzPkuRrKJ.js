let item = await fromUuid("Compendium.wfrp4e-core.items.MnMZv7ZXoRqoH9dS")
let data = item.toObject();
data.system.location.key = this.item.system.location.key
this.actor.createEmbeddedDocuments("Item", [data])




let test = await this.actor.setupSkill(game.i18n.localize("NAME.Endurance"), {fields: {difficulty: "hard"}, appendTitle : ` - ${this.effect.name}`})
await test.roll();
if (test.failed)
{
	this.actor.addCondition("unconscious")
}