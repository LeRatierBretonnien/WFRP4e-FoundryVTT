let test = await this.actor.setupCharacteristic("wp", {appendTitle : ` - ${this.effect.name}`, context : {failure : `<strong>Confused</strong>: Determine behaviour by @Table[bewilder] Table.`}})
await test.roll();
return test.failed