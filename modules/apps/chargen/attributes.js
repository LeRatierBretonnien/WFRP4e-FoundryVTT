import { ChargenStage } from "./stage";

export class AttributesStage extends ChargenStage {

  journalId = "Compendium.wfrp4e-core.journal-entries.IQ0PgoJihQltCBUU.JournalEntryPage.GaZa9sU4KjKDswMr"
  static get defaultOptions() {
  const options = super.defaultOptions;
    options.resizable = true;
    options.width = 400;
    options.height = 785;
    options.classes.push("career");
    options.minimizable = true;
    options.title = game.i18n.localize("CHARGEN.StageAttributes");
    return options;
  }

  static get title() { return game.i18n.localize("CHARGEN.StageAttributes"); }


  get template() { return "systems/wfrp4e/templates/apps/chargen/attributes.html"; }

  constructor(...args) {
    super(...args);

    // Step 1: First roll, Step 2: Swapping, Step 3: Reroll & Swapping, Step 4: Allocating 
    this.context.step = 0;
    this.context.characteristics = {
      ws: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      bs: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      s: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      t: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      i: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      ag: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      dex: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      int: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      wp: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
      fel: { formula: "", roll: 0, add: 0, total: 0, allocated: 0, advances: 0 },
    },
      this.context.allocation = {
        total: 100,
        spent: 0
      };
    this.context.meta = {
      fate: { base: 0, allotted: 0, total: 0 },
      resilience: { base: 0, allotted: 0, total: 0 },
      extra: 0,
      left: 0
    };
    this.context.move = 4;
    this.context.exp = 50;
  }

  async getData() {
    let data = await super.getData();
    if (this.context.step <= 1) {
      this.context.exp = 50;
    }
    else if (this.context.step == 2) {
      this.context.exp = 25;
    }

    else
      this.context.exp = 0;
    return data;
  }

  async rollAttributes(ev, step) {
    if (step)
      this.context.step = step;

    else
      this.context.step++;
    let species = this.data.species;
    let subspecies = this.data.subspecies;

    let characteristicFormulae = game.wfrp4e.config.speciesCharacteristics[species];
    if (subspecies && game.wfrp4e.config.subspecies[species][subspecies].characteristics)
      characteristicFormulae = game.wfrp4e.config.subspecies[species][subspecies].characteristics;

    for (let ch in this.context.characteristics) {
      let [roll, bonus] = characteristicFormulae[ch].split("+").map(i => i.trim());
      roll = roll || "2d10";
      bonus = bonus || 0;
      this.context.characteristics[ch].formula = characteristicFormulae[ch];
      this.context.characteristics[ch].roll = (await new Roll(roll).roll()).total;
      this.context.characteristics[ch].add = bonus;
      this.context.characteristics[ch].allocated = 0;
    }

    this.context.movement = game.wfrp4e.config.speciesMovement[species],
      this.context.meta.fate.base = game.wfrp4e.config.speciesFate[species],
      this.context.meta.resilience.base = game.wfrp4e.config.speciesRes[species],
      this.context.meta.extra = game.wfrp4e.config.speciesExtra[species];


    this.calculateTotals();
    this.render();
  }

  calculateTotals() {
    this.context.allocation.spent = 0;
    for (let ch in this.context.characteristics) {
      let characteristic = this.context.characteristics[ch];
      characteristic.initial = Number((characteristic.allocated || characteristic.roll)) + Number(characteristic.add);
      characteristic.total = characteristic.initial + Number(characteristic.advances);
      this.context.allocation.spent += characteristic.allocated;
    }
    let fate = this.context.meta.fate;
    let resilience = this.context.meta.resilience;
    fate.total = fate.base + fate.allotted;
    resilience.total = resilience.base + resilience.allotted;
    this.context.meta.left = this.context.meta.extra - (resilience.allotted + fate.allotted);
  }

  swap(ch1, ch2) {
    if (this.context.step < 2)
      this.context.step = 2;
    let ch1Roll = duplicate(this.context.characteristics[ch1].roll);
    let ch2Roll = duplicate(this.context.characteristics[ch2].roll);

    this.context.characteristics[ch1].roll = ch2Roll;
    this.context.characteristics[ch2].roll = ch1Roll;

    this.calculateTotals();
    this.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const dragDrop = new DragDrop({
      dragSelector: '.ch-roll',
      dropSelector: '.ch-roll',
      permissions: { dragstart: () => true, drop: () => true },
      callbacks: { drop: this.onDropCharacteristic.bind(this), dragstart: this.onDragCharacteristic.bind(this) },
    });

    dragDrop.bind(html[0]);


    html.find(".meta input").on("change", (ev) => {
      this.context.meta[ev.currentTarget.dataset.meta].allotted = Number(ev.currentTarget.value);
      this.calculateTotals();
      this.render(true);
    });

    html.find(".ch-allocate").on("change", (ev) => {
      this.context.characteristics[ev.currentTarget.dataset.ch].allocated = Number(ev.currentTarget.value);
      this.calculateTotals();
      this.render(true);
    });

    html.find(".ch-advance").on("change", ev => {
      this.context.characteristics[ev.currentTarget.dataset.ch].advances = Number(ev.currentTarget.value);
      this.calculateTotals();
      this.render(true);
    });
  }

  reroll(ev) {
    // Set to step 3
    this.rollAttributes(ev, 3);
  }

  allocate(ev) {
    this.context.step = 4;
    this.render(true);
  }

  _updateObject() {
    for (let ch in this.context.characteristics) {
      this.data.characteristics[ch] = { initial: this.context.characteristics[ch].initial, advances: this.context.characteristics[ch].advances };
    }
    this.data.fate.base = this.context.meta.fate.base;
    this.data.fate.allotted = this.context.meta.fate.allotted;
    this.data.resilience.base = this.context.meta.resilience.base;
    this.data.resilience.allotted = this.context.meta.resilience.allotted;
    this.data.move = game.wfrp4e.config.speciesMovement[this.data.species];
    this.data.exp.characteristics = this.context.exp;
  }

  onDragCharacteristic(ev) {
    ev.dataTransfer.setData("text/plain", JSON.stringify({ ch: ev.currentTarget.dataset.ch }));
  }

  onDropCharacteristic(ev) {
    if (ev.currentTarget.dataset.ch) {
      let ch = JSON.parse(ev.dataTransfer.getData("text/plain")).ch;
      this.swap(ev.currentTarget.dataset.ch, ch);
    }
  }
}
