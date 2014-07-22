// Custom Rally App that displays Defects in a grid and filter by Iteration and/or Severity.
//
// Note: various console debugging messages intentionally kept in the code for learning purposes

Ext.define('CustomApp', {
    extend: 'Rally.app.App',      // The parent class manages the app 'lifecycle' and calls launch() when ready
    componentCls: 'app',          // CSS styles found in app.css

    items: [
        { // this container lets us control the layout of the pulldowns; they'll be added below
        xtype: 'container',
        itemId: 'pulldown-container',
        layout: {
                type: 'hbox',           // 'horizontal' layout
                align: 'stretch'
            }
        },
        {
            xtype: 'container',
            itemId: 'release-container',
            layout: {
                type: 'vbox',
                align: 'stretch'
                }
        },
        {
            xtype: 'container',
            itemId: 'prd-stories-container',
            layout: {
                type: 'vbox',
                align: 'stretch'
                }
        },
        {
            xtype: 'container',
            itemId: 'nfr-stories-container',
            layout: {
                type: 'vbox',
                align: 'stretch'
                }
        },
    ],

    releaseStore: undefined,       // app level references to the store and grid for easy access in various methods
    releaseGrid: undefined,
    prdUserStoryStore: undefined,
    prdUserStoryGrid: undefined,
    nfrUserStoryStore: undefined,
    nfrUserStoryGrid: undefined,

    // Entry Point to App
    launch: function() {

      console.log('TDC Release Burn Up Chart');     // see console api: https://developers.google.com/chrome-developer-tools/docs/console-api

      this._loadReleases();
    },

    // create iteration pulldown and load iterations
    _loadReleases: function() {
        
        var me = this;
        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
          itemId: 'release-combobox',
          fieldLabel: 'Release',
          labelAlign: 'right',
          width: 300,
          listeners: {
              ready: me._loadData,
              select: me._loadData,
              scope: me
            }
        });
        
        console.log("releaseComboBox object:", releaseComboBox);

        me.down('#pulldown-container').add(releaseComboBox);

     },

    _loadData: function() {
        var me = this;
        
        // the _ref is unique, unlike the release name that can change; lets query on it instead!
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        var selectedReleaseName = selectedRelease.get('Name');
        console.log('release reference:', selectedReleaseRef);
        console.log('release name:', selectedReleaseName);
        

        me._loadReleaseData();
        me._loadUserStoryData();
    },
    
    
    // Get release data from Rally
    _loadReleaseData: function() {
      var me = this;

      var selectedReleaseName = me.down('#release-combobox').getRecord().get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      
      console.log('selectedReleaseName', selectedReleaseName);
      
      var myFilters = me._getReleaseFilters(selectedReleaseName);
      
      console.log('my filters', myFilters, myFilters.toString());
      // if store exists, just load new data
      if (me.releaseStore) {
        console.log('store exists');
        me.releaseStore.setFilter(myFilters);
        me.releaseStore.load();

      // create store
      } else {
        console.log('creating store');
        me.releaseStore = Ext.create('Rally.data.wsapi.Store', {     // create defectStore on the App (via this) so the code above can test for it's existence!
          model: 'Release',
          autoLoad: true,                         // <----- Don't forget to set this to true! heh
          filters: myFilters,
          listeners: {
              load: function(myStore, myData, success) {
                  console.log('got release data!', myStore, myData);
                  me._createReleaseTable(myStore, myData);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.
              },
              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'State', 'Theme']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },
    
    // construct filters for defects with given release
    _getReleaseFilters: function(releaseValue) {
        
        var releaseFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Name',
            operation: '=',
            value: releaseValue
            });
      
      console.log('release filter', releaseFilter, releaseFilter.toString());
      
      return releaseFilter;
        
    },
    
    // Create and Show a information for a given release
    _createReleaseTable: function(myReleaseStore, myReleaseData) {
        
        var me = this;
        var selectedRelease = me.down('#release-combobox').getRecord();
        
        var releaseName = selectedRelease.get('Name');

        
        console.log('release store:', myReleaseStore);
        console.log('release data:', myReleaseData);
        
        releaseName = myReleaseData[0].get('Name');
        releaseTheme = myReleaseData[0].get('Theme');
        releaseName = '<p><strong>' + releaseName + '</strong></p>';
        
        console.log('release name:', releaseName);
        console.log('release theme:', releaseTheme);
        
      this.releaseTable = Ext.create('Ext.panel.Panel', {
          title: 'Table Layout',
          //width: 300,
          //height: 150,
          layout: {
              type: 'table',
              //the total column count must be specified here
              columns: 2
          },
          defaults: {
              //applied to each contained panel
              bodyStyle: 'padding:20px'
          },
          items: [{
              html: releaseName,
              colspan: 2
          }, {
              html: 'Cell B content'
          }, {
              html: 'Cell C content'
          }, {
              html: 'Cell D content'
          }, {
              html: 'Cell E content'
          }, {
              html: releaseTheme,
              colspan: 2
          }]
      });
      this.down('#release-container').removeAll();
      this.down('#release-container').add(this.releaseTable);
//      this.add(this.releaseTable);       // add the grid Component to the app-level Container (by doing this.add, it uses the app container)

    },

    // Get release data from Rally
    _loadUserStoryData: function() {
      var me = this;


      var selectedRelease = me.down('#release-combobox').getRecord();
      var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      
      console.log('selectedReleaseName', selectedReleaseName, 'selectedReleaseRef', selectedReleaseRef);
      
      var tagFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Tags.Name',
            operation: 'contains',
            value: 'PRD'
        });      
      console.log('my filters', tagFilter, tagFilter.toString());

      // if store exists, just load new data
      if (me.userStoryStore) {
        console.log('user story store exists');
        me.userStoryStore.setFilter(tagFilter);
        me.userStoryStore.load();

      // create store
      } else {
          console.log('creating user story store');
          me.userStoryStore = Ext.create('Rally.data.wsapi.Store', {
          model: 'User Story',
          autoLoad: true,                         // <----- Don't forget to set this to true! heh
          filters: tagFilter,
          listeners: {
              load: function(myStore, myData, success) {
                  console.log('got user story data!', myStore, myData);
                  var count = myStore.count();
                  console.log("number of prd user stories found: ", count);
                  if (count = 0) {
                      //no PRD user stories for the release
                      console.log('Warning: No PRD user stories in this release!');
                  } else {
                      //for each PRD story in the release get count of children
                      me._inspectUserStories(myStore, selectedRelease);
                  }
                  if (!me.userStoryGrid) {           // only create a grid if it does NOT already exist
                    me._createPRDUserStoryGrid(myStore);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.
                  }
              },
              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['FormattedID', 'Name', 'Description', 'c_MoSCow', 'Release']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },
    
    // construct filters for defects with given release
    _getUserStoryFilters: function(releaseValue, requirementType) {
        
        var releaseFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Release',
            operation: '=',
            value: releaseValue
            });
      
        var tagFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Tags.Name',
            operation: 'contains',
            value: requirementType
        });
        
//        var userStoryFilter = releaseFilter.and(tagFilter);
//        console.log('user story filter', userStoryFilter, userStoryFilter.toString());
//        return userStoryFilter;
        return tagFilter;
//          return releaseFilter;
        
    },
    
    //inspect each user story returned from store
    _inspectUserStories: function(myUserStoryStore) {
        
        var me=this;

        var storiesToBeRemoved = new Array();
        
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!

        console.log('myUserStoryStore:', myUserStoryStore);
        console.log('mySelectedRelease', selectedRelease);
        var numStories = myUserStoryStore.count();
        console.log(numStories, ' PRD stories found!');
        var y = 0;
        do
        {
            myUserStory = myUserStoryStore.getAt(y);
            console.log('myUserStory:', myUserStory);
            //check to see if PRD story has no children and in selected release
            var directChildren = myUserStory.get('DirectChildrenCount');
            var storyRelease = myUserStory.get('Release');
            //var storyReleaseRef = storyRelease.get('_ref');
            console.log('directChildren: ', directChildren);
            console.log('storyRelease: ', storyRelease);
            if (directChildren == 0) {
                //is this story assigned to a release
                if (storyRelease != null) {
                    var storyReleaseRef = storyRelease._ref;
                    console.log('storyReleaseRef:', storyReleaseRef);
                    console.log('selectedReleaseRef:', selectedReleaseRef);
                    if (storyReleaseRef != selectedReleaseRef) {
                        console.log('PRD story has no children and not in the selected release - so remove it from the store');
                        storiesToBeRemoved.push(myUserStory);
                    }
                } else {
                    console.log('PRD story has no children and release is null - so remove it from the store');
                    storiesToBeRemoved.push(myUserStory);
                }
            } else {
                console.log('story has children!');
            }
            y++;
        } while(y<numStories);
        console.log('user stories to be removed:', storiesToBeRemoved);
        for (x in storiesToBeRemoved)
        {
            console.log('removing user story from the store:', x)
            myUserStoryStore.remove(storiesToBeRemoved[x]);
        }
    },

    // Create and Show a Grid of given iterations
    _createPRDUserStoryGrid: function(myUserStoryStore) {

      this.userStoryGrid = Ext.create('Rally.ui.grid.Grid', {
        store: myUserStoryStore,
        columnCfgs: [         // Columns to display; must be the same names specified in the fetch: above in the wsapi data store
          'FormattedID', 'Name', 'Description', 'c_MoSCow', 'Release', 'Parent'
        ]
      });

      this.down('#prd-stories-container').add(this.userStoryGrid);
    }

});
