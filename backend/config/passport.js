const passport = require("passport"); // middleware for authentication
const GoogleStrategy = require("passport-google-oauth20").Strategy; // used to login from google
const GitHubStrategy = require("passport-github2").Strategy; // used to login from github
const FacebookStrategy = require("passport-facebook").Strategy; // used to login from facebook
const User = require("../models/userModel");

// used to build/update oAuth tokens
const buildProviderTokens = (
  accessToken,
  refreshToken,
  existingTokens = {},
) => ({
  accessToken: accessToken || existingTokens.accessToken, //use new token if available or use old ones
  refreshToken: refreshToken || existingTokens.refreshToken, // same logic for refresh token
  tokenType: existingTokens.tokenType, // alsways "Bearer", never changes, just keep old value
  scope: existingTokens.scope,// premissions granted by user, usually doesn't change on token refresh, so keep old value
  expiresAt: existingTokens.expiresAt,// access token expiration time, usually provided by provider, but if not available, keep old value
  refreshTokenExpiresAt: existingTokens.refreshTokenExpiresAt,// refresh token expiration time, usually provided by provider, but if not available, keep old value
  updatedAt: new Date(),// timestamp of when tokens were last updated, always set to now
});

// ---------------- Google ----------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback", // redirects to url after login
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            authProvider: "google",
            isVerified: true,
            oauthTokens: {
              google: buildProviderTokens(accessToken, refreshToken),
            },
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          user.authProvider = user.authProvider || "google";
          user.isVerified = true;
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.google = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.google,
          );
          await user.save({ validateBeforeSave: false });
        } else {
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.google = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.google,
          );
          await user.save({ validateBeforeSave: false });
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    },
  ),
);

// ---------------- GitHub ----------------
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback", // redirects to url after login
      scope: ["user:email"], // request access to user's email addresses
    },

    // runs after logs in on github
    async (accessToken, refreshToken, profile, done) => {
      try {
        //Github may not provide email if it is private, if misssing create fake email username@gmail.com
        let email =
          profile.emails?.[0]?.value || `${profile.username}@github.com`;
        //Gets good name from Github profile or full name from Github API JSON or fallback to Github username
        const githubName =
          profile.displayName || profile._json?.name || profile.username;
        //If user's  name is missing or the existing name is 'user'
        //serach by githubId or email in MongoDB
        const shouldUpdateName = (existingName) =>
          !existingName || existingName.toLowerCase() === "user";
        let user =
          (await User.findOne({ githubId: profile.id })) ||
          (await User.findOne({ email }));
        //if there is no user with the githubId or email, create new user with github profile info
        if (!user) {
          user = await User.create({
            name: githubName,
            email,
            githubId: profile.id,
            authProvider: "github",
            isVerified: true,
            oauthTokens: {
              github: buildProviderTokens(accessToken, refreshToken),
            },
          });
        } //if user exists but doesn't have githubId, link github account to existing user
        else if (!user.githubId) {
          user.githubId = profile.id;
          if (shouldUpdateName(user.name)) {
            user.name = githubName;
          }
          user.authProvider = user.authProvider || "github";
          user.isVerified = true;
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.github = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.github,
          );
          await user.save({ validateBeforeSave: false });
        } //if user exists and has githubId, just update tokens and optionally update name if it is missing or generic like "user"
        else if (shouldUpdateName(user.name) && githubName) {
          user.name = githubName;
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.github = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.github,
          );
          await user.save({ validateBeforeSave: false });
        }// just update tokens if user exists, has githubId, and name is already set to something specific (not missing or generic)
         else {
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.github = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.github,
          );
          await user.save({ validateBeforeSave: false });
        }
        // passport requires calling done() to finsih authentication
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    },
  ),
);

// ---------------- Facebook ----------------
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "/api/auth/facebook/callback",
        profileFields: ["id", "emails", "name", "displayName"],
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let email =
          profile.emails?.[0]?.value || `fb_${profile.id}@facebook.com`;
        const fullName =
          profile.displayName ||
          [profile.name?.givenName, profile.name?.familyName]
            .filter(Boolean)
            .join(" ") ||
          "Facebook User";
        let user =
          (await User.findOne({ facebookId: profile.id })) ||
          (await User.findOne({ email }));
        if (!user) {
          user = await User.create({
            name: fullName,
            email,
            facebookId: profile.id,
            authProvider: "facebook",
            isVerified: true,
            oauthTokens: {
              facebook: buildProviderTokens(accessToken, refreshToken),
            },
          });
        } else if (!user.facebookId) {
          user.facebookId = profile.id;
          user.authProvider = user.authProvider || "facebook";
          user.isVerified = true;
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.facebook = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.facebook,
          );
          await user.save({ validateBeforeSave: false });
        } else {
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.facebook = buildProviderTokens(
            accessToken,
            refreshToken,
            user.oauthTokens.facebook,
          );
          await user.save({ validateBeforeSave: false });
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    },
  ),
);
}

// Serialize user for session (for reference only, not used with JWT)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (for reference only, not used with JWT)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
