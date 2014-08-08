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
    prdUserStoryStore: undefined,
    nfrUserStoryStore: undefined,

    // Entry Point to App
    launch: function() {

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
        
        me.down('#pulldown-container').add(releaseComboBox);
        
        var testPlanCheckbox = Ext.create('Rally.ui.CheckboxField', {
            xtype: 'rallycheckboxfield',
            itemId: 'testplan-checkbox',
            fieldLabel: 'Include Test Plan',
            value: false,
            listeners: {
                change: me._loadData,
                scope: me
            }
        });
        me.down('#pulldown-container').add(testPlanCheckbox);
        
     },

    _loadData: function() {
        var me = this;
        
        // the _ref is unique, unlike the release name that can change; lets query on it instead!
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        var selectedReleaseName = selectedRelease.get('Name');

        me._loadReleaseData();
        me._loadUserStoryData();
    },
    
    
    // Get release data from Rally
    _loadReleaseData: function() {
      var me = this;

      var selectedReleaseName = me.down('#release-combobox').getRecord().get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      
      var myFilters = me._getReleaseFilters(selectedReleaseName);
      
      // if store exists, just load new data
      if (me.releaseStore) {
        me.releaseStore.setFilter(myFilters);
        me.releaseStore.load();

      // create store
      } else {
        me.releaseStore = Ext.create('Rally.data.wsapi.Store', {     // create defectStore on the App (via this) so the code above can test for it's existence!
          model: 'Release',
          autoLoad: true,                         // <----- Don't forget to set this to true! heh
          filters: myFilters,
          listeners: {
              load: function(myStore, myData, success) {
                  me._createReleaseTable(myStore, myData);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.
              },
              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'State', 'Theme', 'Version', 'ReleaseDate', 'ReleaseStartDate', 'Version']   // Look in the WSAPI docs online to see all fields available!
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
      
      return releaseFilter;
        
    },
    
    _getUserStoryFilters: function() {
        var containsPRDTagFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Tags.Name',
            operator: 'contains',
            value: 'PRD'
        });

        var containsNFRTagFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Tags.Name',
            operator: 'contains',
            value: 'NFR'
        });

        var hasChildrenFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'DirectChildrenCount',
            operator: '>',
            value: 0
        });

        var userStoryFilter = containsNFRTagFilter.or(containsPRDTagFilter);
        userStoryFilter = userStoryFilter.or(hasChildrenFilter);
        //console.log('user story filter: ', userStoryFilter.toString(), 'filter object', userStoryFilter);
        return userStoryFilter;
    },

    // Create and Show a information for a given release
    _createReleaseTable: function(myReleaseStore, myReleaseData) {
        
        var me = this;
        var selectedRelease = me.down('#release-combobox').getRecord();
        
        var releaseName = selectedRelease.get('Name');
        
        releaseName = myReleaseData[0].get('Name');
        releaseTheme = myReleaseData[0].get('Theme');
        //console.log('release name: ', releaseName);
        //console.log('release theme: ', releaseTheme);
        //console.log('release store: ', myReleaseStore, 'release data: ', myReleaseData);
        releaseName = '<p><strong>' + releaseName + '</strong></p>';
        
        releaseVersion = myReleaseData[0].get('Version');
        
        var releaseStart = new Date(myReleaseData[0].get('ReleaseStartDate'));
        
        releaseEnd = new Date(myReleaseData[0].get('ReleaseDate'));
        
        releaseState = myReleaseData[0].get('State');
        
        this.releaseTable = Ext.create('Ext.panel.Panel', {
          title: 'Release Overview',
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
              html: 'Version: ' + releaseVersion
          }, {
              html: 'Release State: ' + releaseState
          }, {
              html: 'Release Start Date: ' + Ext.Date.format(releaseStart, 'F j, Y')
          }, {
              html: 'Release Date: ' + Ext.Date.format(releaseEnd, 'F j, Y')
          }, {
              html: releaseTheme,
              colspan: 2
          }]
      });
      this.down('#release-container').removeAll();
      this.down('#release-container').add(this.releaseTable);
    },

    // Get release data from Rally
    _loadUserStoryData: function() {
      var me = this;


      var selectedRelease = me.down('#release-combobox').getRecord();
      var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!

      // if store exists, just load new data
      if (me.userStoryStore) {
        me.userStoryStore.load();

      // create store
      // a few notes here.  the api only returns 200 user stories.  Some projects have much more than 200 stories so the report
      // was generating properly.  A ticket has been opened with rally (case #66347).  In the meantime the following was done to
      // 'patch' the report so it would work
      // 1. we are sorting based on FormattedID is descending order, and
      // 2. filter by user stories that have the PRD or the NFR tag, and
      // 3. filter by user stories that have children
      } else {
          var currentProject = this.getContext().getProject();
          //console.log('current project: ', currentProject);
          
          
          me.userStoryStore = Ext.create('Rally.data.wsapi.Store', {
          model: 'User Story',
          limit: Infinity,
          pageSize: 30000,
          autoLoad: true,
          context: {
              project: this.getContext().getProjectRef(),
              projectScopeUp: true,
              projectScopeDown: true
          },
          //filters: me._getUserStoryFilters(),
          /*
          filters: [
              {
                  property: 'FormattedID',
                  operator: '>',
                  value: 'US9000'
              }],
          */
          sorters: [
              {
                  property: 'FormattedID',
                  direction: 'DESC'
              }],
          listeners: {
              load: function(myStore, myData, success) {
                  var count = myStore.count();
                  //console.log('myStore: ', myStore, myData);
                  if (count == 0) {
                      //no PRD user stories for the release
                      console.log('Warning: No user stories found!');
                  } else {
                      //console.log('Found ', count, ' user stories');
                      console.log('User Stories found in project: ', myStore, myData);
                      //console.log('myData:', myData);
                      PRDRequirements = me._inspectUserStories(myStore, "PRD");
                      //console.log("PRD User Stories found in project: ", PRDRequirements);
                      me._renderRequirementsGrid(PRDRequirements, "PRD");
                      NFRRequirements = me._inspectUserStories(myStore, "NFR");
                      //console.log('NFR User Stories found in project: ', NFRRequirements);
                      me._renderRequirementsGrid(NFRRequirements, "NFR");
                  }
              },
              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['FormattedID', 'Name', 'Description', 'c_MoSCow', 'Release', 'Children', 'Parent', 'Tags', 'c_TestPlan']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },
    
    _getPRDUserStories: function(myUserStoryStore, requirementType) {

        //console.log("In _getPRDUserStories - myUserStoryStore: ", myUserStoryStore, "requirement type:", requirementType);
        var y = 0;
        var numStories = myUserStoryStore.count();
        
        var requirementTypeUserStories = new Array();

        do
        {
            myUserStory = myUserStoryStore.getAt(y);
            formattedID = myUserStory.get('FormattedID');
            //console.log('FormattedID: ', formattedID, ' myUserStory: ', myUserStory);
            myTags = myUserStory.get('Tags');
            if (myTags.Count > 0) {
                //console.log('user story has tags:', myTags);
                tagsNameArray = myTags._tagsNameArray;
                var prdUserStory = false;
                //console.log('tags name array: ', tagsNameArray);
                for (tag in tagsNameArray) {
                    //console.log('tag name:', tagsNameArray[tag].Name);
                    if (tagsNameArray[tag].Name == requirementType) {
                        prdUserStory = true;
                    }
                }
                if (prdUserStory == true) {
                    requirementTypeUserStories.push(myUserStory);
                    //console.log('pushing user story into array: ', myUserStory);
                } else {
                }
            }
            y++;
        } while (y<numStories);
        return requirementTypeUserStories;
    },
    
    //get all the releases that the given user story is a part of.
    //a given user story can be a parent where the children are assigned to multiple releases
    //a given user story can be a user story that has no children and is assigned to a given release
    //a given user story can be a user story that has no children and is not assigned to any release
    //a given user story can be a parent where the children are not assigned to any releases
    //this function returns an array containing all the releases that this story or it's children have been assigned.
    _getReleases: function(myUserStory, myUserStoryStore) {
        var me=this;
        var releaseRefs = new Array();
        var releaseNames = new Array();

        var directChildren = myUserStory.get('DirectChildrenCount');

        if (directChildren == 0) {
            var storyRelease = myUserStory.get('Release');
            //is this story assigned to a release
            if (storyRelease != null) {
                //console.log('story release object: ', storyRelease);
                var storyReleaseRef = storyRelease._ref;
                storyReleaseName = storyRelease.Name;
                //console.log('storyReleaseRef: ', storyReleaseRef, 'storyReleaseName: ', storyReleaseName);
                releaseRefs.push(storyReleaseRef);
                releaseNames.push(storyReleaseName);
            } else {
                releaseRefs.push(null);
                releaseNames.push("");
            }
        } else {
            //find children user stories
            var userStoryFormattedID = myUserStory.get('FormattedID');
            var childrenUserStories = new Array();
            myUserStoryStore.each(function(myUserStory) {
                var myParentObj = myUserStory.get('Parent');
                if (myParentObj != null) {
                    var myFormattedID = myParentObj.FormattedID;
                    if (myFormattedID == userStoryFormattedID) {
                        childrenUserStories.push(myUserStory);
                    }
                }
            }, this);

            for(x in childrenUserStories) {
                childrenReleases = this._getReleases(childrenUserStories[x], myUserStoryStore);
                for (x in childrenReleases) {
                    // releaseRefs.push(childrenReleases[x]);
                    releaseNames.push(childrenReleases[x]);
                }
            }
        }
        //return(releaseRefs);
        return(releaseNames);
    },
    
    //inspect each user story returned from store to determine if it still needs to bin in the store.
    _inspectUserStories: function(myUserStoryStore, requirementType) {
        
        var me=this;

        var PRDStories = new Array();
        
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        
        PRDStories = this._getPRDUserStories(myUserStoryStore, requirementType);

        var numPRDStories = PRDStories.length;
        var PRDRecords = new Array();
        var PRDReleases = new Array();
        for (PRDStory in PRDStories) {

            PRDReleases = this._getReleases(PRDStories[PRDStory], myUserStoryStore);
            //console.log('PRDReleases for user story ', PRDStories[PRDStory].get('FormattedID'), ' are: ', PRDReleases);
            PRDReleases = this._arrayUnique(PRDReleases);
            
            //if the PRD User Story is implemented in whole or in part in the selected release add it to the store
            if (this._arrayContains(PRDReleases, selectedReleaseName)) {
                //formulate data to add to store
                if (PRDReleases.length > 1) {
                    note = true;
                } else {
                    note = false;
                }            
                PRDRecord = {
                    'UserStory': PRDStories[PRDStory],
                    'SpansReleases': note
                };
                PRDRecords.push(PRDRecord);
            }
        }
        return PRDRecords;
    },

    _renderRequirementsGrid: function(PRDRecords, requirementType) {
        
        if (requirementType == 'PRD') {
            containerName = '#prd-stories-container';
            storeId = 'prdUserStoryStore';
            title = 'Functional Requirements';
        }
        if (requirementType == 'NFR') {
            containerName = '#nfr-stories-container';
            storeId = 'nfrUserStoryStore';
            title = 'Non-Functional Requirements';
        }
        
        this.down(containerName).removeAll();
        
        //check value of checkbox for test plan to detemine if we need to add a column for test plan
        var testPlanCheckboxValue = this.down('#testplan-checkbox').getValue();
        gridFields = ['FormattedID', 'Name', 'Description', 'MoSCoW'];
        if (testPlanCheckboxValue == true) {
            gridFields.push('Test Plan')
        };
        
        if (PRDRecords.length != 0) {
            
            //create store to hold the data
            userStoryStore = Ext.create('Ext.data.Store', {
                storeId: storeId,
                fields: gridFields,
                proxy: {
                    type: 'memory',
                    reader: {
                        type: 'json',
                        root: 'items'
                    }
                }
            })

            for (x in PRDRecords) {
                userStory = PRDRecords[x].UserStory;

                PRDRecord = {
                    'FormattedID': userStory.get('FormattedID'),
                    'Name': userStory.get('Name'),
                    'Description': userStory.get('Description'),
                    'MoSCoW': userStory.get('c_MoSCoW')
                };

                if (testPlanCheckboxValue == true) {
                    PRDRecord['Test Plan'] = userStory.get('c_TestPlan');
                };

                userStoryStore.add(PRDRecord);                
            }

            gridColumns = [
                { text: 'FormattedID', dataIndex: 'FormattedID', width: 100},
                { text: 'Name', dataIndex: 'Name', width: 400},
                { text: 'Description', dataIndex: 'Description', flex: 1, renderer: function(value){
                    var display = '<p style="white-space:normal">' + value + '</p>';
                    return display;
                    }},
                { text: 'MoSCoW', dataIndex: 'MoSCoW', width: 100
                }
                ];
    
            if (testPlanCheckboxValue == true) {
                gridColumns.push({text: 'Test Plan', dataIndex: 'Test Plan', width: 400, renderer: function(value){
                    var display = '<p style="white-space:normal">' + value + '</p>';
                    return display;
                    }});
            };

            //create and display the grid
            userStoryGrid = Ext.create('Ext.grid.Panel', {
                title: title,
                store: Ext.data.StoreManager.lookup(storeId),
                columns: gridColumns,
                    renderTo: Ext.getBody()
            });
            this.down(containerName).add(userStoryGrid);
        } else {
            //there are no user stories to be displayed.  Let's create a simple message to inform the user
            userStoryLabel = Ext.create('Ext.form.Panel', {
                title: title,
                width:400,
                padding: 10,
                renderTo: Ext.getBody(),
                layout: {
                    type: 'hbox',
                    align: 'middle'
                },
                items: [{
                    xtype: 'label',
                    forID: 'myFieldId',
                    text: 'No user stories with ' + requirementType + ' tag found in selected release!',
                    margin: '0 0 0 10'
                }]
            });
            this.down(containerName).add(userStoryLabel);
        }
    },
    
    _arrayUnique: function(a) {
        return a.reduce(function(p, c) {
            if (p.indexOf(c) < 0) p.push(c);
            return p;
        }, []);
    },

    _arrayContains: function(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }
});
