import { PhysicalItemModel } from "./physical";
let fields = foundry.data.fields;

export class PropertiesItemModel extends PhysicalItemModel {
    static defineSchema() {
        let schema = super.defineSchema();
        schema.qualities = new fields.SchemaField({
            value: new fields.ArrayField(new fields.ObjectField({}))
        });
        schema.flaws = new fields.SchemaField({
            value: new fields.ArrayField(new fields.ObjectField({}))
        });
        return schema;
    }

    get loading() {
        return this.flaws.reload
    }

    get repeater() {
        return this.qualities.repeater
    }

    get properties() {

        if (!this.qualities || !this.flaws) {
            return { qualities: {}, flaws: {} }
        }

        let properties = {
            qualities: this.constructor._propertyArrayToObject(this.qualities.value, game.wfrp4e.utility.qualityList()),
            flaws: this.constructor._propertyArrayToObject(this.flaws.value, game.wfrp4e.utility.flawList()),
            unusedQualities: {},
            inactiveQualities: {}
        }

        if (this.type == "weapon" && this.isOwned && !this.skillToUse && this.actor.type != "vehicle") {
            properties.unusedQualities = properties.qualities
            properties.qualities = {}
            if (this.ammo)
                properties.qualities = this.ammo.properties.qualities
        }

        if (this.type == "weapon" && this.isOwned) {
            for (let prop in properties.qualities) {
                let property = properties.qualities[prop]
                if (Number.isNumeric(property.group) && !property.active) {
                    properties.inactiveQualities[prop] = property;
                    delete properties.qualities[prop];
                }
            }
        }

        properties.special = this.special?.value
        if (this.ammo)
            properties.specialAmmo = this.ammo.properties.special

        return properties;
    }

    get originalProperties() {
        let properties = {
            qualities: this.constructor._propertyArrayToObject(this._source.system.qualities.value, game.wfrp4e.utility.qualityList()),
            flaws: this.constructor._propertyArrayToObject(this._source.system.flaws.value, game.wfrp4e.utility.flawList()),
            unusedQualities: {}
        }
        return properties;
    }

    get OriginalQualities() {
        let qualities = Object.values(this.originalProperties.qualities)
        let ungrouped = qualities.filter(i => !i.group).map(q => q.display)
        let grouped = []
        let groupNums = this.QualityGroups
        for (let g of groupNums) {
            grouped.push(qualities.filter(i => i.group == g).map(i => i.display).join(" " + game.i18n.localize("QualitiesOr") + " "))
        }
        return ungrouped.concat(grouped)
    }

    get OriginalFlaws() {
        return Object.values(this.originalProperties.flaws).map(f => f.display)
    }


    // Related to OR qualities - can choose which one is active
    get QualityGroups() {
        // return groups with no duplicates
        return Object.values(this.originalProperties.qualities)
            .map(i => i.group)
            .filter(i => Number.isNumeric(i))
            .filter((value, index, array) => {
                return array.findIndex(i => value == i) == index
            });
    }

    get Qualities() {
        return Object.values(this.qualities).map(q => q.display)
    }

    get UnusedQualities() {
        return Object.values(this.unusedQualities).map(q => q.display)
    }

    get InactiveQualities() {
        return Object.values(this.inactiveQualities).map(q => q.display)
    }

    get Flaws() {
        return Object.values(this.flaws).map(f => f.display)
    }

    computeBase() {
        super.computeBase();

        // will probably cause issues with super class calculating encumbrance too
        if (this.encumbrance && this.quantity) {
            if (this.qualities?.lightweight && this.encumbrance.value >= 1)
                this.encumbrance.value -= 1
            if (this.flaws?.bulky)
                this.encumbrance.value += 1

            this.encumbrance.value = (this.encumbrance.value * this.quantity.value)
            if (this.encumbrance.value % 1 != 0)
                this.encumbrance.value = this.encumbrance.value.toFixed(2)
        }
    }

    /**
   * 
   * @param {Object} properties properties object to add
   */
    _addProperties(properties) {
        let qualities = this.qualities.value;
        let flaws = this.flaws.value;

        for (let q in properties.qualities) {
            let hasQuality = qualities.find(quality => quality.name == q)
            if (hasQuality && properties.qualities[q].value) {
                hasQuality.value += properties.qualities[q].value
            }
            else
                qualities.push({ name: q, value: properties.qualities[q].value })
        }
        for (let f in properties.flaws) {
            let hasQuality = flaws.find(flaw => flaw.name == f)
            if (hasQuality && properties.flaws[f].value) {
                hasQuality.value += properties.flaws[f].value
            }
            else
                flaws.push({ name: f, value: properties.flaws[f].value })
        }
    }

    static _propertyArrayToObject(array, propertyObject) {

        let properties = {}

        // Convert quality/flaw arry into an properties object (accessible example `item.properties.qualities.accurate` or `item.properties.flaws.reload.value)
        if (array) {
            array.forEach(p => {
                if (propertyObject[p.name]) {
                    properties[p.name] = {
                        key: p.name,
                        display: propertyObject[p.name],
                        value: p.value,
                        group: p.group,
                        active: p.active
                    }
                    if (p.value)
                        properties[p.name].display += " " + (Number.isNumeric(p.value) ? p.value : `(${p.value})`)

                }
                else if (p.custom) {
                    properties[p.key] = {
                        key: p.key,
                        display: p.display
                    }
                }
                // Unrecognized
                else properties[p.name] = {
                    key: p.name,
                    display: p.name
                }
            })
        }

        return properties
    }


}