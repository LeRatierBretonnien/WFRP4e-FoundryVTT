return args.skill.name.includes(game.i18n.localize("NAME.Ranged")) || args.item?.attackType == "ranged" || args.item?.name == game.i18n.localize("NAME.Charm");