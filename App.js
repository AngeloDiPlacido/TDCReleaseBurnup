// Custom Rally App that displays a PRD report.  
/* 
In July 2014 the TDC decided to capture PRD requirements in Rally instead of a word document.

So this report creates a PRD from Rally.  There are 3 parts of this report:
1. Release Information
2. PRD Requirements,
3. NFR Requirements

Release information is pulled from the Release entity in Rally
PRD Requirements are functional requirements.  These are user stories that have the PRD tag
NFR Requirements are non-functional requirements.  These are user stories that have the NFR tag.

Some notes:
This report would be a lot simpler if not for 1 thing.  When user stories have children they cannot be associated
with a release.  So if we want to determine what user PRD or NFR user stories that are in a release we need to

1. Identify user stories tagged with NFR or PRD that don't have any children that are assigned to the release
2. Identify user stories tagged with NFR or PRD that have a children that are assigned to the release

Once these stories are identified I create 2 simple grids that display the PRD or NFR tagged user stories.

*/

Ext.define('CustomApp', {
    extend: 'Rally.app.App',      // The parent class manages the app 'lifecycle' and calls launch() when ready
    componentCls: 'app',          // CSS styles found in app.css

    items: [
        { // define the containers that will be used to control the layout of the report.  These are added in the code below.
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
        }
    ],

    releaseStore: undefined,       // app level references to the store and grid for easy access in various methods
    prdUserStoryStore: undefined,
    nfrUserStoryStore: undefined,

    // Entry Point to App
    launch: function() {

      this._loadReleases();
    },

    // create the release pulldown and test plan checkbox
    _loadReleases: function() {
        
        var me = this;
        
        // create the release combobox.  When the ready event fires then load the data.  Also load the data when the
        // user selects a different release.
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

        // add the release combobox to the container so it is displayed in the report        
        me.down('#pulldown-container').add(releaseComboBox);
        
        // create the test plan checkbox and add it to the pull down container so it is displayed in the report
        // if the user changes the value of the checkbox reload the data
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

    // this function called whenever the user selects a release from the release pull down or changes the test plan
    // checkbox.
    _loadData: function() {
        var me = this;

        /*
        
        Get the release that the use has selected.
        
        Notes:  when this report was initially written we identified the release that the stories were in by the release reference
        which is unique in Rally.  This was later changed to release name instead because there are products that have multiple teams.
        What the teams do in this instance is create a parent project with children under it for each team.  When a release is created
        its reference is unique to the project.  So in order to get the report to generate regardless of where in the project
        heirarchy you are in we:
        1. enabled the report to pull user stories both up and down the heirarchy.
        2. used release name to identify if a story is in the release.
        
        */
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseRef = selectedRelease.get('_ref');
        var selectedReleaseName = selectedRelease.get('Name');
        me.down('#release-container').removeAll();
        me.down('#prd-stories-container').removeAll();
        me.down('#nfr-stories-container').removeAll();
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
        // create releaseStore on the App (via this) so the code above can test for it's existence!
        me.releaseStore = Ext.create('Rally.data.wsapi.Store', {
          model: 'Release',
          autoLoad: true,
          filters: myFilters,
          listeners: {
              load: function(myStore, myData, success) {
                  me._createReleaseTable(myStore, myData);
              },
              scope: me
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
    
    /*
    Construct a filter to be used to retreive stories from the rally release store.  This filter is a little more
    complex that I really wanted.  But it basically gets all user stories that:
    1. have either the PRD or NFR tag, OR
    2. are assigned to the selected release and have a parent, OR
    3. has children and has a parent (because stories can have multiple levels of heirarchy)
    
    I need to include these stories since the inspect user story function first identifies all PRD or NFR user stories
    and then traveres the hierarchy if the PRD/NFR user story has children.  If all the children are not loaded in the 
    store then will not be able to traverse the tree.
    */
    _getUserStoryFilters: function(releaseName) {
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

        var hasParentFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Parent',
            operator: '!=',
            value: null
        });

        var hasChildrenFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'DirectChildrenCount',
            operator: '>',
            value: 0
        });

        var inReleaseFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Release.Name',
            operation: '=',
            value: releaseName
        });
        
        var nullReleaseFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Release.Name',
            operation: '=',
            value: null
        });
        
        var userStoryFilter1 = containsNFRTagFilter.or(containsPRDTagFilter);
        var userStoryFilter2 = inReleaseFilter.and(hasParentFilter);
        var userStoryFilter3 =  hasParentFilter.and(hasChildrenFilter);
        var userStoryFilter = userStoryFilter1.or(userStoryFilter2);
        userStoryFilter = userStoryFilter.or(userStoryFilter3);
        
        //console.log('user story filter: ', userStoryFilter.toString(), 'filter object', userStoryFilter);
        return userStoryFilter;
    },

    // Create and Show a information for a given release
    // Note - If a user reports a problem where the release information is not being displayed in the
    // report yet when you are in Rally you see the release theme does contain content what could be happening
    // is that a release was created for a parent project and then automatically created for children projects.
    // Now if someone goes in to the child project they can edit the release for that project potentially clearing out the description.
    // So if you are geneating a PRD report for that release in that child project the release description will come from the release for that
    // project.  Releases are unique to a project.  Just something to look at if release theme not displayed for a particular project.
    _createReleaseTable: function(myReleaseStore, myReleaseData) {
        
        var me = this;
        var selectedRelease = me.down('#release-combobox').getRecord();
        
        var releaseName = selectedRelease.get('Name');
        var releaseRef = selectedRelease.get('_ref');
        
        releaseName = myReleaseData[0].get('Name');
        releaseTheme = myReleaseData[0].get('Theme');
        //console.log('release name: ', releaseName);
        //console.log('release theme: ', releaseTheme);
        //console.log('release ref: ', releaseRef);
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
      this.down('#release-container').add(this.releaseTable);
    },

    /*
    This function will get user stories from rally using the wsapi Store.  It will then determine which user stories that have the PRD or NFR
    tag that are implemented as part of the selected release.  See note at top of this file in regards to user stories and hierarchy and how release
    information in parents is cleared out if it has children.
    
    Once these stories are identified a simple grid is created and displayed for the PRD and NFR stories.
    
    */
    _loadUserStoryData: function() {
      var me = this;


      var selectedRelease = me.down('#release-combobox').getRecord();
      var selectedReleaseName = selectedRelease.get('Name');
      var selectedReleaseRef = selectedRelease.get('_ref');

      // if store exists, just load new data
      if (me.userStoryStore) {
          me.userStoryStore.setFilter(me._getUserStoryFilters(selectedReleaseName));
          me.userStoryStore.load();

      // create store
      } else {
          var currentProject = this.getContext().getProject();

          me.userStoryStore = Ext.create('Rally.data.wsapi.Store', {
          model: 'User Story',
          limit: Infinity,
          pageSize: 200,
          autoLoad: true,
          context: {
              project: this.getContext().getProjectRef(),
              projectScopeUp: true,
              projectScopeDown: true
          },
          filters: me._getUserStoryFilters(selectedReleaseName),
          sorters: [
              {
                  property: 'FormattedID',
                  direction: 'DESC'
              }],

          listeners: {
              load: function(myStore, myData, success) {
                  var PRDRequirements = []; //new Array();
                  var NFRRequirements = []; //new Array();
                  var count = myStore.count();
                  //console.log('myStore: ', myStore, myData);
                  if (count === 0) {
                      //no PRD user stories for the release
                      console.log('Warning: No user stories found!');
                  } else {
                      console.log('Found ', count, ' user stories');
                      //console.log('User Stories found in project: ', myStore, myData);
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
          fetch: ['FormattedID', 'Name', 'Description', 'c_MoSCow', 'Release', 'Children', 'Parent', 'Tags', 'c_TestPlan', 'HasParent']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },
    
    // this story identifies stories that have the tag that matches requirementType parameter (either "NFR" or "PRD")
    _getPRDUserStories: function(myUserStoryStore, requirementType) {

        //console.log("In _getPRDUserStories - myUserStoryStore: ", myUserStoryStore, "requirement type:", requirementType);
        var y = 0;
        var numStories = myUserStoryStore.count();
        
        var requirementTypeUserStories = []; //new Array();

        do
        {
            var myUserStory = myUserStoryStore.getAt(y);
            //console.log('FormattedID: ', myUserStory.get('FormattedID'), ' myUserStory: ', myUserStory);
            var myTags = myUserStory.get('Tags');
            if (myTags.Count > 0) {
                //console.log('user story has tags:', myTags);
                var tagsNameArray = myTags._tagsNameArray;
                var prdUserStory = false;
                //console.log('tags name array: ', tagsNameArray);
                for (var tag in tagsNameArray) {
                    //console.log('tag name:', tagsNameArray[tag].Name);
                    if (tagsNameArray[tag].Name == requirementType) {
                        prdUserStory = true;
                    }
                }
                if (prdUserStory === true) {
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
    // The following is a list of user stories scenarios that this function needs to be aware of:
    // 1. a given user story can be a parent where the children are assigned to multiple releases
    // 2. a given user story can be a user story that has no children and is assigned to a given release
    // 3. a given user story can be a user story that has no children and is not assigned to any release
    // 4. a given user story can be a parent where the children are not assigned to any releases
    //
    //this function returns an array containing all the releases that this story or any of it's children have been assigned.
    _getReleases: function(myUserStory, myUserStoryStore) {

        var releaseRefs = []; //new Array();
        var releaseNames = []; //new Array();

        var directChildren = myUserStory.get('DirectChildrenCount');

        // does this user story have any children
        if (directChildren === 0) {
            
            var storyRelease = myUserStory.get('Release');
            //is this story assigned to a release
            if (storyRelease !== null) {
                //console.log('story release object: ', storyRelease);
                var storyReleaseRef = storyRelease._ref;
                var storyReleaseName = storyRelease.Name;
                //console.log('storyReleaseRef: ', storyReleaseRef, 'storyReleaseName: ', storyReleaseName);
                releaseRefs.push(storyReleaseRef);
                releaseNames.push(storyReleaseName);
            } else {
                releaseRefs.push(null);
                releaseNames.push("");
            }
        } else {
            //find the children user stories of this user story
            var userStoryFormattedID = myUserStory.get('FormattedID');
            var childrenUserStories = []; //new Array();
            myUserStoryStore.each(function(myUserStory) {
                var myParentObj = myUserStory.get('Parent');
                if (myParentObj !== null) {
                    var myFormattedID = myParentObj.FormattedID;
                    if (myFormattedID == userStoryFormattedID) {
                        childrenUserStories.push(myUserStory);
                    }
                }
            }, this);

            // for each child get the list of releases that it or it's children are a part of.  Note that this story
            // will recursively call _getReleases until we get down to the lowest level story
            for(var x in childrenUserStories) {
                var childrenReleases = this._getReleases(childrenUserStories[x], myUserStoryStore);
                for (x in childrenReleases) {
                    // releaseRefs.push(childrenReleases[x]);
                    releaseNames.push(childrenReleases[x]);
                }
            }
        }
        //return(releaseRefs);
        return(releaseNames);
    },
    
    //inspect each user story returned from store to determine which PRD or NFR requirement is part of a release.
    _inspectUserStories: function(myUserStoryStore, requirementType) {
        
        var me=this;

        var PRDStories = []; //new Array();
        
        var selectedRelease = me.down('#release-combobox').getRecord();
        var selectedReleaseName = selectedRelease.get('Name');
        
        //get the user stories that are tagged with requirementType (either PRD or NFR)
        PRDStories = this._getPRDUserStories(myUserStoryStore, requirementType);

        var PRDRecords = []; //new Array();
        var PRDReleases = []; //new Array();
        for (var PRDStory in PRDStories) {

            //determine the releases that this PRDStory is related to.  Note it is possible for a PRD story has 2 children which are assigned to 2 different releases
            PRDReleases = this._getReleases(PRDStories[PRDStory], myUserStoryStore);
            //console.log('PRDReleases for user story ', PRDStories[PRDStory].get('FormattedID'), ' are: ', PRDReleases);
            //remove duplicates from the array that is returned.
            PRDReleases = this._arrayUnique(PRDReleases);
            
            //if the PRD User Story is implemented in whole or in part in the selected release add it to the store
            if (this._arrayContains(PRDReleases, selectedReleaseName)) {
                //formulate data to add to store
                var note = true;
                if (PRDReleases.length > 1) {
                    note = true;
                } else {
                    note = false;
                }            
                var PRDRecord = {
                    'UserStory': PRDStories[PRDStory],
                    'SpansReleases': note
                };
                PRDRecords.push(PRDRecord);
            }
        }
        return PRDRecords;
    },

    //given an array of records that are in the release create and populate a grid to display them in the report
    _renderRequirementsGrid: function(PRDRecords, requirementType) {
        
        var containerName;
        var storeId;
        var title;
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
        
        //check value of checkbox for test plan to detemine if we need to add a column for test plan
        var testPlanCheckboxValue = this.down('#testplan-checkbox').getValue();
        var gridFields = ['FormattedID', 'Name', 'Description', 'MoSCoW'];
        if (testPlanCheckboxValue === true) {
            gridFields.push('Test Plan');
        }
        
        if (PRDRecords.length !== 0) {
            
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
            });

            for (var x in PRDRecords) {
                var userStory = PRDRecords[x].UserStory;

                var PRDRecord = {
                    'FormattedID': userStory.get('FormattedID'),
                    'Name': userStory.get('Name'),
                    'Description': userStory.get('Description'),
                    'MoSCoW': userStory.get('c_MoSCoW')
                };

                if (testPlanCheckboxValue === true) {
                    PRDRecord['Test Plan'] = userStory.get('c_TestPlan');
                }

                userStoryStore.add(PRDRecord);                
            }

            //the renderer function that is included is required to make the text in column wrap
            var gridColumns = [
                { text: 'FormattedID', dataIndex: 'FormattedID', width: 100},
                { text: 'Name', dataIndex: 'Name', width: 400, renderer: function(value){
                    var display = '<p style="white-space:normal">' + value + '</p>';
                    return display;
                    }},
                { text: 'Description', dataIndex: 'Description', flex: 1, renderer: function(value){
                    var display = '<p style="white-space:normal">' + value + '</p>';
                    return display;
                    }},
                { text: 'MoSCoW', dataIndex: 'MoSCoW', width: 100
                }
                ];
    
            if (testPlanCheckboxValue === true) {
                gridColumns.push({text: 'Test Plan', dataIndex: 'Test Plan', width: 400, renderer: function(value){
                    var display = '<p style="white-space:normal">' + value + '</p>';
                    return display;
                    }});
            }

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
