# ShaderTool
A modern shadertoy client with additional features.
[Site In Development](https://ahs3n.github.io/ShaderTool/)



# Features to implement

## UX
- Will need to create several pages 
	- Shader page
		- See [Functionality](ShaderTool.md#Functionality)
	- Home page
	- Login page
		- We will not create accounts for security reasons. We'd have to bypass the security which would make it too easy for bad actors
	- Better search page, loading shaders 12 at a time by scraping each page of results on shadertoy
		- need countermeasures against shaders which crash webGL
		- DO NOT run shader on load. only if the user hovers and not if there is a compile time warning.
	- Better browse page, same as search. 
	- User page
		- search in user profile
	- Account page
		- contains
			- Shaders
			- Playlists
			- Notifications
			- Social
			- Config
			- Account
			- ShaderTool exclusive preferences.
				- maybe just name the tab "ShaderTool"
## Functionality
- Set frame resolution
- volume slider
- Export
	- Export json
	- import json
	- Render
		- Resolution
		- Framerate
		- Frames
		- Prefix
		- Preview
		- Render
- Controls
	- Paint calls
	- Frame Timer
	- Time controls
		- set bounds
		- slider
		- loop toggle
	- iFrame
	- mouse
	- date
		- reset to present
- Extra data
	- User data
		- Storage options
			- Cookies
				- Semi volatile
				- Seems risky
				- If user clears cookies, poof go their preferences
			- Shader stored in account
				- A private shader stored on the user's account where preferences can be stored, automatically read/writing when the user saves their preferences.
				- What could possibly go wrong? fallback to cookies until preference shader loads perhaps
		- Stuff to store
			- Theme colours
			- new shader template
			- font url possibly?
			- default resolution?
			- typing sound effect
			- typing screen rumble
	- Additional shader functionality
		- Comments at the top of the code which store data about iChannel behaviour and more
			- examples:
				- `// iChannel0 - texture - src:https://url.to.some/image.png`
				- alt: `// iChannel0 - src:https://url.to.some/image.webp` default to image source unless file extension is recognized
				- `// iChannel1 - audio - src:https://etc.`
				- `// iChannel2 - video - src:https://url.to.some/video.mp4`
				- `// mouse capture - true/false/0/1` default to false
			- These will be automatically added into the code when the user uses the GUI menus to add sources, but the user can also type it manually, and it will show up in the iChannel GUI
- Misc
	- recent shaders list, all a elements so they click properly
	- possibly our own featured shaders based on community nominations
	- 