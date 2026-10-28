---
title: "Dev Mode"
description: "Export tokens from Dev Mode and Figma for VS Code, and what works differently there."
---

The plugin also runs in Dev Mode and in [Figma for VS Code](https://help.figma.com/hc/en-us/articles/15023121296151), so developers with a Dev seat can export tokens themselves. Open a file in Dev Mode, go to **Plugins** in the right sidebar and run TokensBruecke.

| Feature                                    | Figma Design | Dev Mode                                                         |
| ------------------------------------------ | ------------ | ---------------------------------------------------------------- |
| Export: settings, download, push, profiles | ✅           | ✅                                                               |
| Show output                                | ✅ sidebar   | ✅ fills the panel, with a back button                           |
| Import tokens into variables               | ✅           | ❌ Dev Mode is read-only for every plugin, even with edit access |
| Window resizing                            | ✅           | the panel is resized by you, not the plugin                      |

To import tokens, someone with a Full seat and edit access to the file runs the plugin in Figma Design. Which seats can run plugins where is listed in Figma's [plugin help article](https://help.figma.com/hc/en-us/articles/360042532714): a Dev seat runs plugins in Dev Mode only, and Dev Mode needs a paid plan.

Set-up is personal: profiles and server credentials are stored per user. To give developers the same settings, [share a profile in the file](../output-and-profiles/#shared-profiles).
