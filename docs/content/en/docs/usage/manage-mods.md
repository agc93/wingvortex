---
title: "Managing your installed mods"
linkTitle: "Managing Mods"
weight: 25
description: >
  How to manage and tweak your installed mods in Vortex.
---

Many mods won't require much extra setup or configuration but some mods may need a little fine-tuning or extra options to work reliably.

If you haven't already, open the Games screen and click the **Manage** button on the Project Wingman icon under *Unmanaged*, then install your mods as outlined in [the previous section](../installation).

---

## Load Order

If you have multiple mods changing the same values or mods that depend on each other, you might need to tweak the order the game loads the mods. You can do that by opening the Load Order tab from the left panel and you will see a list of your enabled mods in the main view. Drag-and-drop your mods as needed to control the order you want them loaded and the next time your mods are deployed, Vortex will automatically arrange your files in the `~mods` folder to ensure they load in the correct order.

> Note that (like all UE4 games), the _last_ mod to modify a resource "wins" so lower mods overwrite higher ones in the list.

## Conflict Detection

To help with spotting where you have conflicting mods, WingVortex will automatically scan your installed mods to identify the most common sources of conflicts: aircraft skins and datatable mods (aka blueprint mods).

When your mods are deployed, if any of your enabled mods are replacing the same skin slots or the same data tables you will get a warning notification informing you of the conflict. The game will still load mods even if they are conflicting, so this is often your best bet for spotting mods that may not work together.

When Vortex warns you of a conflict, you can either disable some of the conflicting mods until there are no more conflicts, try your luck in-game anyway (_not recommended_) or use the [PSM Integration](../psm-integration) to try and merge compatible mods.