module.exports = {

    db: process.env.MONGODB || 'mongodb://localhost:27017/test',

    sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

    facebook: {
        clientID: process.env.FACEBOOK_ID || ' ',
        clientSecret: process.env.FACEBOOK_SECRET || ' ',
        callbackURL: '/auth/facebook/callback',
        passReqToCallback: true
    }

};
