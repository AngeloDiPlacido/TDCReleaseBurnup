// Custom Rally App that displays Defects in a grid and filter by Iteration and/or Severity.
//
// Note: various console debugging messages intentionally kept in the code for learning purposes

Ext.define('CustomApp', {
    extend: 'Rally.app.App',      // The parent class manages the app 'lifecycle' and calls launch() when ready
    componentCls: 'app',          // CSS styles found in app.css
    
    launch: function() {
        var stories = Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            fetch: ['Defects']
        });
        stories.load().then({
            success: this.loadChildren,
            scope: this
        }).then({
            success: function() {
                //great success!
            },
            failure: function(error) {
                //oh noes!
            }
        });
    },

    loadChildren: function(stories) {
        var promises = [];
        console.log('in loadChildren function');
        console.log('stories: ', stories);
        _.each(stories, function(story) {
            var defects = story.get('Defects');
            if(defects.Count > 0) {
                console.log(defects.Count, 'defects found');
                defects.store = story.getCollection('Defects');
                promises.push(defects.store.load());
                console.log('defects found: ', defects.store);
            } else {
                console.log('No defects found!');
            }
        });
        return Deft.Promise.all(promises);
    }


});
