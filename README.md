# ShaderTool
A modern shadertoy client with additional features.
[Site In Development](https://ahs3n.github.io/ShaderTool/)

Feel free to contribute! We will be moving forward with vanilla JS to minimize abstractions and external dependencies. Try not to create too many tiny one line functions if you don't need to reuse them more than once.


# Features to implement

## UX
- Will need to create several pages 
	- Shader page
		- See [Functionality](README.md#Functionality)
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
			- typing screen rumble, particles, fx :P
	- Additional shader functionality
		- Comments at the top of the code which store data about iChannel behaviour and more
			- Should be case sensitive because URLs are
			- examples:
				- `// iChannel0 - texture - src:https://url.to.some/image.png`
					- alt: `// iChannel0 - src:https://url.to.some/image.webp` - default to texture unless file extension is recognized
				- `// iChannel1 - audio - src:https://url.to.som/audio.mp3.`
					- `// iChannel1 - audio - src:https://soundcloud.com/artist/track` - Yes, we will try to fix soundcloud before iq
				- `// iChannel2 - video - src:https://url.to.some/video.mp4`
				- `// mouse capture - true/false/0/1` default to false
				- `// iChannel3 - BufferA` If the user types something like this in their file, add it to the GUI and save in Shadertoy
					- Can also work with all other shadertoy inputs,
						- E.g. `// iChannelX - *`
							- `keyboard`
							- `microphone` (alt: `mic`)
							- `webcam` (alt: `cam`, `camera`)
							- `cubemap` (there's only one, no need to specify A, but alt: `cubemapA`). Also textures as `cubemap - forest`
							- `audio - ourpithyaptor`
			- These will be automatically added into the code when the user uses the GUI menus to add sources, but the user can also type it manually, and it will show up in the iChannel GUI
- Misc
	- recent shaders list, all `<a>` elements so they click properly
	- possibly our own featured shaders based on community nominations

## Critical design decisions
- Never hide anything from the user. The text the user inputs is what gets saved
	- Nothing like adding custom inputs and obscuring it, and then adding a "See this shader on Shadertool for full functionality!" to the saved shader secretly
	- Custom channel inputs added by Shadertool must be specified in the code and shown to the user, even if added via GUI
- Any shaders written in ShaderTool must be valid shader code and compile as normal on Shadertoy, just with limited features. 
	- e.g. Shadertoy might have default textures instead of custom ones

