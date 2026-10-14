# Woodcutting audit: axe creation and charges

Regular felling axes require a handle, a hammer and an adjacent anvil. Crystal
axes are the exception: converting either active or inactive crystal axes requires
76 Smithing and Crafting beside a native singing bowl, with existing charges
preserved. A hammer and anvil do not substitute for the singing bowl.

The crystal distinction follows the [crystal felling axe description](https://oldschool.runescape.wiki/w/Crystal_felling_axe)
and [Woodcutting training guide](https://oldschool.runescape.wiki/w/Pay-to-play_Woodcutting_training).
The ordinary recipe follows the [rune felling axe description](https://oldschool.runescape.wiki/w/Rune_felling_axe).

Crystal singing creates crystal axes with 10,000 charges. Shards add 100 charges
each up to 20,000. Native Revert offers dismantling into the dragon equivalent and
tool seed, or uncharging into the inactive crystal tool; both discard all charges.
Infernal creation and recharge consume their materials and supply 5,000 charges.

Standalone axe checks exercise actual inventory mutation helpers against native
cache definitions: ingredient rejection, inventory capacity, metadata preservation,
charge depletion, crystal singing output, and both felling creation paths. These
checks do not substitute for a live client interaction regression run.
