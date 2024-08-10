/**
 * A direct port of https://github.com/chicoden/shadertoy-xapi/blob/main/lib/xapi.py for JavaScript
 */

const ShaderPrivacy = Objects.freeze({
    PRIVATE: 0,
    UNLISTED: 2,
    PUBLIC: 1,
    PUBLIC_API: 3,
    ANONYMOUS: 4
});

const PlaylistPrivacy = Objects.freeze({
    PRIVATE: 0,
    UNLISTED: 1,
    PUBLIC: 2
});

const NotificationType = Objects.freeze({
    POST: 1,
    REPLY: 2,
    FOLLOW: 4,
    PUBLISH: 8,
    LIKE: 16
});

