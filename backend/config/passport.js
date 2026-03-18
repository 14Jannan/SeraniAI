const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/userModel');

// ---------------- Google ----------------
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        authProvider: 'google',
        isVerified: true
      });
    }
    done(null, user);
  } catch (err) { done(err, null); }
}));

// ---------------- GitHub ----------------
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/auth/github/callback",
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: profile.displayName || profile.username,
        email,
        githubId: profile.id,
        authProvider: 'github',
        isVerified: true
      });
    }
    done(null, user);
  } catch (err) { done(err, null); }
}));

// ---------------- Facebook ----------------
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name', 'displayName']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let email = profile.emails?.[0]?.value || `fb_${profile.id}@facebook.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: profile.displayName,
        email,
        facebookId: profile.id,
        authProvider: 'facebook',
        isVerified: true
      });
    }
    done(null, user);
  } catch (err) { done(err, null); }
}));