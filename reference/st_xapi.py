"""
A library for interacting with the shadertoy extended API.
shadertoy.com has no documentation of this API and as far as
I know, this API is unstable and may change at any time, so
be careful relying on this library.

Current capabilities:
- signin/signout
- get embeddable shader urls
- get/create/update/fork/delete shaders
- get all shaders (or only public)
- report shader
- report shader crash
- like/unlike shader
- get/create/update/delete playlist
- get shader relation to playlists
- add/remove shader from playlist
- get/post/hide/unhide comments
- get notifications
- get following/followers
- follow/unfollow users
- create app
- delete app

>>> from lib.xapi import ShadertoySession
>>> session = ShadertoySession()
>>> session.signin("username", "password")
>>> shader_ids = session.get_all_shaders()
>>> shader = session.get_shaders(shader_ids[:1])[0]
>>> fork_id = session.upload_shader(shader, is_fork=True)
>>> session.signout()
"""

import requests
from urllib.parse import urlparse, parse_qsl
import base64
import json
from enum import Enum

# Test shaders
# - https://www.shadertoy.com/view/Dd3GR8
# - https://www.shadertoy.com/view/433SDr
# - https://www.shadertoy.com/view/MXtXWN
# - https://www.shadertoy.com/view/MXcSWr

# TODO
# - get shaders in playlist (scrape gShaderIDs array)
# - get apps (scrape table)
# - get/set account preferences?
# - create/change pw/delete account???

class ShaderPrivacy(Enum):
    # Don't ask me why
    PRIVATE = 0
    UNLISTED = 2
    PUBLIC = 1
    PUBLIC_API = 3
    ANONYMOUS = 4

class PlaylistPrivacy(Enum):
    PRIVATE = 0
    UNLISTED = 1
    PUBLIC = 2

class NotificationType(Enum):
    POST = 1
    REPLY = 2
    FOLLOW = 4
    PUBLISH = 8
    LIKE = 16

class ErrorCode(Enum):
    INVALID_SIGNIN = 0
    NAME_ALREADY_USED = 1
    SESSION_EXPIRED = 2
    USES_PRIVATE_ASSETS = 3
    ACCOUNT_UNVERIFIED = 4
    DAILY_QUOTA_REACHED = 5
    OPERATION_FAILED = 6
    SIGNIN_REQUIRED = 7

class ShadertoyError(Exception):
    def __init__(self, code, message=None):
        self.code = code
        if not message:
            if code == ErrorCode.INVALID_SIGNIN:
                message = "invalid username or password"

            elif code == ErrorCode.NAME_ALREADY_USED:
                message = "name already in use"

            elif code == ErrorCode.SESSION_EXPIRED:
                message = "session expired"

            elif code == ErrorCode.USES_PRIVATE_ASSETS:
                message = "uses private assets"

            elif code == ErrorCode.ACCOUNT_UNVERIFIED:
                message = "account has not been verified yet"

            elif code == ErrorCode.DAILY_QUOTA_REACHED:
                message = "daily quota for your current status has been reached"

            elif code == ErrorCode.OPERATION_FAILED:
                message = "operation failed"

            elif code == ErrorCode.SIGNIN_REQUIRED:
                message = "signin required"

            else:
                message = "unspecified error"

        super().__init__(message)

class ShadertoySession:
    def __init__(self):
        self.session = requests.Session()
        self.signed_in = False

        # Set default headers to be included in every request
        # This is ESSENTIAL. Also, every request must specify a Referer URL.
        self.session.headers.update({
            "User-Agent": "shadertoy-client",
            "Origin": "https://www.shadertoy.com"
        })

    def require_signin(self):
        """ Raises error with code ErrorCode.SIGNIN_REQUIRED if not signed in. """
        if not self.signed_in:
            raise ShadertoyError(ErrorCode.SIGNIN_REQUIRED)

    def signin(self, username, password):
        """ Signs into shadertoy with the given username and password. """
        if self.signed_in:
            self.signout()

        response = self.session.post(
            "https://www.shadertoy.com/signin", data=[
                ("user", username),
                ("password", password)
            ], headers={
                "Referer": "https://www.shadertoy.com/signin"
            }
        )

        # Check if we got sent back to signin with an error
        url = urlparse(response.url)
        query = parse_qsl(url.query)
        if url.path == "/signin" and ("error", "1") in query:
            raise ShadertoyError(ErrorCode.INVALID_SIGNIN)

        self.signed_in = True

    def signout(self):
        """ Signs out of shadertoy. """
        if self.signed_in:
            self.session.post(
                "https://www.shadertoy.com/signout", headers={
                    "Referer": "https://www.shadertoy.com/"
                }
            )

            self.signed_in = False

    def clear_cookies(self):
        """ Clears all cookies stored in the session. """
        self.session.cookies.clear()

    def close(self):
        """ Closes the session. Call this when you are done using the session. """
        self.session.close()

    def get_embeddable_url(self, shader_id, show_gui=True, start_time=10, paused=True, muted=False):
        """ Returns an embeddable URL for the given shader with the given settings. """
        url = "https://www.shadertoy.com/embed/" + shader_id
        url += "?gui=" + ("true" if show_gui else "false")
        url += "&t=" + str(start_time)
        url += "&paused=" + ("true" if paused else "false")
        url += "&muted=" + ("true" if muted else "false")
        return url

    def get_all_shaders(self, only_public=False):
        """
        Based on doExportAllShaders()
        Returns a list of all shaders encoded in JSON.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("gsibuifpt", "1"),
                ("op", "true" if only_public else "false")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=shaders"
            }
        ).json()

        if response["result"] == 0:
            return response["shaderlist"]["id"]

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def get_shaders(self, shader_ids, include_tags=True, include_user_like=True, include_parent_info=True):
        """
        Based on getAllShaders()
        doExportShader() only gets one but does it in the same way.
        Returns a list of shaders encoded in JSON.
        """

        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("s", json.dumps({"shaders": [*shader_ids]})),
                ("nt", "1" if include_tags else "0"),
                ("nl", "1" if include_user_like else "0"),
                ("np", "1" if include_parent_info else "0")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=shaders"
            }
        ).json()

        return response

    def upload_shader(self, shader_json, shader_icon=None, is_update=False, is_fork=False):
        """
        Based on openSubmitShaderForm()
        Returns the ID assigned by shadertoy to the shader.
        """

        self.require_signin()
        payload = [
            ("f" if is_fork else ("u" if is_update else "a"), json.dumps(shader_json))
        ]

        if shader_icon:
            with shader_icon:
                ext = shader_icon.name[shader_icon.name.rfind(".")+1:]
                data = base64.b64encode(shader_icon.read()).decode("utf-8")
                data_url = "data:image/" + ext + ";base64," + data
                payload.append(("ss", data_url))

        response = self.session.post(
            "https://www.shadertoy.com/shadertoy",
            data=payload, headers={
                "Referer": "https://www.shadertoy.com/new"
            }
        ).json()

        # Error codes used by shaderSaved()
        error_code = response["result"]
        if error_code == 0:
            return response["id"]

        if error_code == -2:
            raise ShadertoyError(ErrorCode.NAME_ALREADY_USED)

        if error_code == -3:
            raise ShadertoyError(ErrorCode.SESSION_EXPIRED)

        if error_code == -13:
            raise ShadertoyError(ErrorCode.USES_PRIVATE_ASSETS)

        if error_code == -15:
            raise ShadertoyError(ErrorCode.ACCOUNT_UNVERIFIED)

        if error_code == -16:
            raise ShadertoyError(ErrorCode.DAILY_QUOTA_REACHED)

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def delete_shader(self, shader_id):
        """
        Based on doDeleteShader()
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("s", shader_id),
                ("d", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=shaders"
            }
        ).json()

        return response == 0

    def set_shader_like(self, shader_id, like=True):
        """
        Based on img(#shaderLike).onclick
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("s", shader_id),
                ("l", "1" if like else "0")
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response == True or response["result"] == 0

    def report_shader(self, shader_id):
        """
        Based on doReportShader()
        Returns a bool determining whether the operation succeeded or failed.
        """

        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("s", shader_id),
                ("r", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response["result"] == 0

    def report_crash(self, shader_id):
        """
        Based on iReportCrash()
        Returns a bool determining whether the operation succeeded or failed.
        """

        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("s", shader_id),
                ("r", "2")
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response["result"] == 0

    def get_shader_playlist_stats(self, shader_id):
        """
        Based on doAddToPlaylist()
        Returns JSON containing info on all playlists.
        The "system" field is an array with a 1 for playlists created by shadertoy
        by default (e.g. "Watch later" and "Loved") or a 0 for user created playlists.
        The "exists" field is an array with a 1 for playlists to which the shader
        shader_id was added, 0 otherwise.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("psg", "1"),
                ("sid", shader_id)
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        # Shadertoy seems to just ignore this field
        #if response["result"] != 0:
        #    raise ShadertoyError(ErrorCode.OPERATION_FAILED)

        return response["playlists"]

    def add_shader_to_playlist(self, shader_id, playlist_id):
        """
        Based on iAddShaderToPlaylist()
        Returns a bool determining whether the operation succeeded or failed.
        Note: also returns False if the shader is already in the playlist,
        check first with get_shader_playlist_stats().
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("pas", "1"),
                ("pid", playlist_id),
                ("sid", shader_id)
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response["result"] == 0

    def remove_shader_from_playlist(self, shader_id, playlist_id):
        """
        Based on iDelShaderToPlaylist()
        Returns a bool determining whether the operation succeeded or failed.
        Note: also returns False if the shader is not in the playlist,
        check first with get_shader_playlist_stats().
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("prs", "1"),
                ("pid", playlist_id),
                ("sid", shader_id)
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response["result"] == 0

    def get_comments(self, shader_id):
        """
        Based on loadComments()
        Returns the comments section on the given shader encoded in JSON.
        """

        return self.session.post(
            "https://www.shadertoy.com/comment", data=[
                ("s", shader_id)
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

    def post_comment(self, shader_id, comment):
        """
        Based on addComment()
        Returns the updated comments section on the given shader encoded in JSON.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/comment", data=[
                ("s", shader_id),
                ("comment", comment)
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        error_code = response["added"]
        if error_code > 0:
            return response

        if error_code == -1:
            raise ShadertoyError(ErrorCode.ACCOUNT_UNVERIFIED)

        if error_code == -3:
            raise ShadertoyError(ErrorCode.DAILY_QUOTA_REACHED)

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def set_comment_visibility(self, shader_id, comment_id, visible=True):
        """
        Based on hideComment()
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/comment", data=[
                ("s", shader_id),
                ("c", comment_id),
                ("hide", "0" if visible else "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/view/" + shader_id
            }
        ).json()

        return response["hide"] != 0

    def get_playlists(self):
        """
        Based on refreshPlaylistsTable()
        Returns JSON containing info on all playlists.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("pg", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=playlists"
            }
        ).json()

        # Shadertoy seems to just ignore this field
        #if response["result"] != 0:
        #    raise ShadertoyError(ErrorCode.OPERATION_FAILED)

        return response["playlists"]

    def get_shaders_in_playlist(self, playlist_id):
        # Appears that we'll have to do this with some scraping
        raise NotImplementedError

    def create_playlist(self, name, description, privacy=PlaylistPrivacy.PRIVATE):
        """
        Based on doDialogPlaylistSend()
        Returns the ID assigned by shadertoy to the new playlist.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("pa", "1"),
                ("name", name),
                ("description", description),
                ("published", privacy.value)
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=playlists"
            }
        ).json()

        if response["result"] == 0:
            return response["id"]

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def set_playlist_metadata(self, playlist_id, name, description, privacy):
        """
        Based on doDialogPlaylistSend()
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("pu", "1"),
                ("pua", playlist_id),
                ("name", name),
                ("description", description),
                ("published", privacy.value)
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=playlists"
            }
        ).json()

        return response["result"] == 0

    def delete_playlist(self, playlist_id):
        """
        Based on removePlaylist()
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("pd", "1"),
                ("pda", playlist_id)
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=playlists"
            }
        ).json()

        return response["result"] == 0

    def get_notifications(self):
        """
        Based on refreshNotificationsTable()
        Returns JSON containing info on recent notifications.
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("ng", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=notifications"
            }
        ).json()

        # Shadertoy seems to just ignore this field
        #if response["result"] != 0:
        #    raise ShadertoyError(ErrorCode.OPERATION_FAILED)

        return response["notifications"]

    def get_socials(self):
        """
        Based on refreshSocialsTable()
        Returns a dict with two entries:
        "following": a dict containing info about users you are following
        "followers": a dict containing info about users following you
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("fcg", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=social"
            }
        ).json()

        if response["result"] == 0:
            del response["result"]
            return response

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def set_following(self, user, follow=True):
        """
        Based on follow()
        Returns a bool determining whether the operation succeeded or failed.
        Note: failure may mean that you have already followed or unfollowed
        the user, check with get_socials()
        """

        self.require_signin()
        response = self.session.post(
            "https://www.shadertoy.com/shadertoy", data=[
                ("fs" if follow else "fu", "1"),
                ("uid", user)
            ], headers={
                "Referer": "https://www.shadertoy.com/profile/?show=social"
            }
        ).json()

        return response["result"] == 0

    def get_apps(self):
        # Appears that we'll have to do this with some scraping
        raise NotImplementedError

    def create_app(self, name, description):
        """
        Based on doSubmitApp()
        Currently cannot retrieve the API key assigned to the app.
        """

        self.require_signin()
        error_code = self.session.post(
            "https://www.shadertoy.com/myapps", data=[
                ("a", "1"),
                ("name", name),
                ("desc", description)
            ], headers={
                "Referer": "https://www.shadertoy.com/myapps"
            }
        ).json()

        if error_code == 0:
            return

        if error_code == -2:
            raise ShadertoyError(ErrorCode.NAME_ALREADY_USED)

        raise ShadertoyError(ErrorCode.OPERATION_FAILED)

    def delete_app(self, app_key):
        """
        Based on doDeleteApp()
        Returns a bool determining whether the operation succeeded or failed.
        """

        self.require_signin()
        error_code = self.session.post(
            "https://www.shadertoy.com/myapps", data=[
                ("id", app_key),
                ("d", "1")
            ], headers={
                "Referer": "https://www.shadertoy.com/myapps"
            }
        ).json()

        return error_code == 0e