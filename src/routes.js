const pageRoutes = Object.freeze({
    home: '/',
    administration: '/administration',
    addAdministrator: '/add-administrator',
    kidLogin: '/kid-login',
    professionalLogin: '/professional-login',
    kids: '/kids',
    addKid: '/add-kid',
    kidActivities: '/kid-activities',
    activities: '/activities',
    addActivity: '/add-activity',
    playActivity: '/play-activity',
});

const apiRoutes = Object.freeze({
    administrators: '/api/administrators',
    administrator: '/api/administrators/:id',
    professionalLogin: '/api/administrators/login',
    kidLogin: '/api/kids/login',
    kids: '/api/kids',
    kid: '/api/kids/:kid_id',
    kidActivities: '/api/kids/:kid_id/activities',
    kidActivityResults: '/api/kids/:kid_id/activity-results',
    activity: '/api/activities/:activity_id',
    activityResults: '/api/activities/:activity_id/results',
    activityRewards: '/api/activities/:activity_id/rewards',
    result: '/api/activity-results/:id',
    reward: '/api/rewards/:id',
});

function routeWithParams(template, params) {
    return template.replace(/:(\w+)/g, (_, name) => {
        if (params[name] === undefined || params[name] === null) {
            throw new Error(`Missing route parameter: ${name}`);
        }
        return encodeURIComponent(params[name]);
    });
}

module.exports = { pageRoutes, apiRoutes, routeWithParams };
