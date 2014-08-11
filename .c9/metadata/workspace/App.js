{"changed":true,"filter":false,"title":"App.js","tooltip":"/App.js","value":"// Custom Rally App that displays Defects in a grid and filter by Iteration and/or Severity.\n//\n// Note: various console debugging messages intentionally kept in the code for learning purposes\n\nExt.define('CustomApp', {\n    extend: 'Rally.app.App',      // The parent class manages the app 'lifecycle' and calls launch() when ready\n    componentCls: 'app',          // CSS styles found in app.css\n\n    items: [\n        { // this container lets us control the layout of the pulldowns; they'll be added below\n        xtype: 'container',\n        itemId: 'pulldown-container',\n        layout: {\n                type: 'hbox',           // 'horizontal' layout\n                align: 'stretch'\n            }\n        },\n        {\n            xtype: 'container',\n            itemId: 'release-container',\n            layout: {\n                type: 'vbox',\n                align: 'stretch'\n                }\n        },\n        {\n            xtype: 'container',\n            itemId: 'prd-stories-container',\n            layout: {\n                type: 'vbox',\n                align: 'stretch'\n                }\n        },\n        {\n            xtype: 'container',\n            itemId: 'nfr-stories-container',\n            layout: {\n                type: 'vbox',\n                align: 'stretch'\n                }\n        },\n    ],\n\n    releaseStore: undefined,       // app level references to the store and grid for easy access in various methods\n    prdUserStoryStore: undefined,\n    nfrUserStoryStore: undefined,\n\n    // Entry Point to App\n    launch: function() {\n\n      this._loadReleases();\n    },\n\n    // create iteration pulldown and load iterations\n    _loadReleases: function() {\n        \n        var me = this;\n        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {\n          itemId: 'release-combobox',\n          fieldLabel: 'Release',\n          labelAlign: 'right',\n          width: 300,\n          listeners: {\n              ready: me._loadData,\n              select: me._loadData,\n              scope: me\n            }\n        });\n        \n        me.down('#pulldown-container').add(releaseComboBox);\n        \n        var testPlanCheckbox = Ext.create('Rally.ui.CheckboxField', {\n            xtype: 'rallycheckboxfield',\n            itemId: 'testplan-checkbox',\n            fieldLabel: 'Include Test Plan',\n            value: false,\n            listeners: {\n                change: me._loadData,\n                scope: me\n            }\n        });\n        me.down('#pulldown-container').add(testPlanCheckbox);\n        \n     },\n\n    _loadData: function() {\n        var me = this;\n        \n        // the _ref is unique, unlike the release name that can change; lets query on it instead!\n        var selectedRelease = me.down('#release-combobox').getRecord();\n        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n        var selectedReleaseName = selectedRelease.get('Name');\n        me.down('#release-container').removeAll();\n        me.down('#prd-stories-container').removeAll();\n        me.down('#nfr-stories-container').removeAll();\n        me._loadReleaseData();\n        me._loadUserStoryData();\n    },\n    \n    \n    // Get release data from Rally\n    _loadReleaseData: function() {\n      var me = this;\n\n      var selectedReleaseName = me.down('#release-combobox').getRecord().get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n      \n      var myFilters = me._getReleaseFilters(selectedReleaseName);\n      \n      // if store exists, just load new data\n      if (me.releaseStore) {\n        me.releaseStore.setFilter(myFilters);\n        me.releaseStore.load();\n\n      // create store\n      } else {\n        me.releaseStore = Ext.create('Rally.data.wsapi.Store', {     // create defectStore on the App (via this) so the code above can test for it's existence!\n          model: 'Release',\n          autoLoad: true,                         // <----- Don't forget to set this to true! heh\n          filters: myFilters,\n          listeners: {\n              load: function(myStore, myData, success) {\n                  me._createReleaseTable(myStore, myData);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.\n              },\n              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions\n          },\n          fetch: ['Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'State', 'Theme', 'Version', 'ReleaseDate', 'ReleaseStartDate', 'Version']   // Look in the WSAPI docs online to see all fields available!\n        });\n      }\n    },\n    \n    // construct filters for defects with given release\n    _getReleaseFilters: function(releaseValue) {\n        \n        var releaseFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Name',\n            operation: '=',\n            value: releaseValue\n            });\n      \n      return releaseFilter;\n        \n    },\n    \n    _getUserStoryFilters: function(releaseName) {\n        var containsPRDTagFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Tags.Name',\n            operator: 'contains',\n            value: 'PRD'\n        });\n\n        var containsNFRTagFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Tags.Name',\n            operator: 'contains',\n            value: 'NFR'\n        });\n\n        var hasParentFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Parent',\n            operator: '!=',\n            value: null\n        });\n\n        var hasChildrenFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'DirectChildrenCount',\n            operator: '>',\n            value: 0\n        });\n\n        var inReleaseFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Release.Name',\n            operation: '=',\n            value: releaseName\n        });\n        \n        var nullReleaseFilter = Ext.create('Rally.data.wsapi.Filter', {\n            property: 'Release.Name',\n            operation: '=',\n            value: null\n        });\n        \n        var userStoryFilter1 = containsNFRTagFilter.or(containsPRDTagFilter);\n        var userStoryFilter2 = inReleaseFilter.and(hasParentFilter);\n        var userStoryFilter3 =  hasParentFilter.and(hasChildrenFilter);\n        var userStoryFilter = userStoryFilter1.or(userStoryFilter2);\n        userStoryFilter = userStoryFilter.or(userStoryFilter3);\n        \n        //console.log('user story filter: ', userStoryFilter.toString(), 'filter object', userStoryFilter);\n        return userStoryFilter;\n    },\n\n    // Create and Show a information for a given release\n    _createReleaseTable: function(myReleaseStore, myReleaseData) {\n        \n        var me = this;\n        var selectedRelease = me.down('#release-combobox').getRecord();\n        \n        var releaseName = selectedRelease.get('Name');\n        \n        releaseName = myReleaseData[0].get('Name');\n        releaseTheme = myReleaseData[0].get('Theme');\n        //console.log('release name: ', releaseName);\n        //console.log('release theme: ', releaseTheme);\n        //console.log('release store: ', myReleaseStore, 'release data: ', myReleaseData);\n        releaseName = '<p><strong>' + releaseName + '</strong></p>';\n        \n        releaseVersion = myReleaseData[0].get('Version');\n        \n        var releaseStart = new Date(myReleaseData[0].get('ReleaseStartDate'));\n        \n        releaseEnd = new Date(myReleaseData[0].get('ReleaseDate'));\n        \n        releaseState = myReleaseData[0].get('State');\n        \n        this.releaseTable = Ext.create('Ext.panel.Panel', {\n          title: 'Release Overview',\n          layout: {\n              type: 'table',\n              //the total column count must be specified here\n              columns: 2\n          },\n          defaults: {\n              //applied to each contained panel\n              bodyStyle: 'padding:20px'\n          },\n          items: [{\n              html: releaseName,\n              colspan: 2\n          }, {\n              html: 'Version: ' + releaseVersion\n          }, {\n              html: 'Release State: ' + releaseState\n          }, {\n              html: 'Release Start Date: ' + Ext.Date.format(releaseStart, 'F j, Y')\n          }, {\n              html: 'Release Date: ' + Ext.Date.format(releaseEnd, 'F j, Y')\n          }, {\n              html: releaseTheme,\n              colspan: 2\n          }]\n      });\n      //this.down('#release-container').removeAll();\n      this.down('#release-container').add(this.releaseTable);\n    },\n\n    // Get release data from Rally\n    _loadUserStoryData: function() {\n      var me = this;\n\n\n      var selectedRelease = me.down('#release-combobox').getRecord();\n      var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n      var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n\n      // if store exists, just load new data\n      if (me.userStoryStore) {\n          me.userStoryStore.setFilter(me._getUserStoryFilters(selectedReleaseName));\n          me.userStoryStore.load();\n\n      // create store\n      // a few notes here.  the api only returns 200 user stories.  Some projects have much more than 200 stories so the report\n      // was generating properly.  A ticket has been opened with rally (case #66347).  In the meantime the following was done to\n      // 'patch' the report so it would work\n      // 1. we are sorting based on FormattedID is descending order, and\n      // 2. filter by user stories that have the PRD or the NFR tag, and\n      // 3. filter by user stories that have children\n      } else {\n          var currentProject = this.getContext().getProject();\n\n          me.userStoryStore = Ext.create('Rally.data.wsapi.Store', {\n          model: 'User Story',\n          limit: Infinity,\n          pageSize: 200,\n          autoLoad: true,\n          context: {\n              project: this.getContext().getProjectRef(),\n              projectScopeUp: true,\n              projectScopeDown: true\n          },\n          filters: me._getUserStoryFilters(selectedReleaseName),\n          sorters: [\n              {\n                  property: 'FormattedID',\n                  direction: 'DESC'\n              }],\n\n          listeners: {\n              load: function(myStore, myData, success) {\n                  var count = myStore.count();\n                  //console.log('myStore: ', myStore, myData);\n                  if (count == 0) {\n                      //no PRD user stories for the release\n                      console.log('Warning: No user stories found!');\n                  } else {\n                      console.log('Found ', count, ' user stories');\n                      //console.log('User Stories found in project: ', myStore, myData);\n                      PRDRequirements = me._inspectUserStories(myStore, \"PRD\");\n                      //console.log(\"PRD User Stories found in project: \", PRDRequirements);\n                      me._renderRequirementsGrid(PRDRequirements, \"PRD\");\n                      NFRRequirements = me._inspectUserStories(myStore, \"NFR\");\n                      //console.log('NFR User Stories found in project: ', NFRRequirements);\n                      me._renderRequirementsGrid(NFRRequirements, \"NFR\");\n                  }\n              },\n              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions\n          },\n          fetch: ['FormattedID', 'Name', 'Description', 'c_MoSCow', 'Release', 'Children', 'Parent', 'Tags', 'c_TestPlan', 'HasParent']   // Look in the WSAPI docs online to see all fields available!\n        });\n      }\n    },\n    \n    _getPRDUserStories: function(myUserStoryStore, requirementType) {\n\n        //console.log(\"In _getPRDUserStories - myUserStoryStore: \", myUserStoryStore, \"requirement type:\", requirementType);\n        var y = 0;\n        var numStories = myUserStoryStore.count();\n        \n        var requirementTypeUserStories = new Array();\n\n        do\n        {\n            myUserStory = myUserStoryStore.getAt(y);\n            formattedID = myUserStory.get('FormattedID');\n            //console.log('FormattedID: ', formattedID, ' myUserStory: ', myUserStory);\n            myTags = myUserStory.get('Tags');\n            if (myTags.Count > 0) {\n                //console.log('user story has tags:', myTags);\n                tagsNameArray = myTags._tagsNameArray;\n                var prdUserStory = false;\n                //console.log('tags name array: ', tagsNameArray);\n                for (tag in tagsNameArray) {\n                    //console.log('tag name:', tagsNameArray[tag].Name);\n                    if (tagsNameArray[tag].Name == requirementType) {\n                        prdUserStory = true;\n                    }\n                }\n                if (prdUserStory == true) {\n                    requirementTypeUserStories.push(myUserStory);\n                    //console.log('pushing user story into array: ', myUserStory);\n                } else {\n                }\n            }\n            y++;\n        } while (y<numStories);\n        return requirementTypeUserStories;\n    },\n    \n    //get all the releases that the given user story is a part of.\n    //a given user story can be a parent where the children are assigned to multiple releases\n    //a given user story can be a user story that has no children and is assigned to a given release\n    //a given user story can be a user story that has no children and is not assigned to any release\n    //a given user story can be a parent where the children are not assigned to any releases\n    //this function returns an array containing all the releases that this story or it's children have been assigned.\n    _getReleases: function(myUserStory, myUserStoryStore) {\n        var me=this;\n        var releaseRefs = new Array();\n        var releaseNames = new Array();\n\n        var directChildren = myUserStory.get('DirectChildrenCount');\n\n        if (directChildren == 0) {\n            var storyRelease = myUserStory.get('Release');\n            //is this story assigned to a release\n            if (storyRelease != null) {\n                //console.log('story release object: ', storyRelease);\n                var storyReleaseRef = storyRelease._ref;\n                storyReleaseName = storyRelease.Name;\n                //console.log('storyReleaseRef: ', storyReleaseRef, 'storyReleaseName: ', storyReleaseName);\n                releaseRefs.push(storyReleaseRef);\n                releaseNames.push(storyReleaseName);\n            } else {\n                releaseRefs.push(null);\n                releaseNames.push(\"\");\n            }\n        } else {\n            //find children user stories\n            var userStoryFormattedID = myUserStory.get('FormattedID');\n            var childrenUserStories = new Array();\n            myUserStoryStore.each(function(myUserStory) {\n                var myParentObj = myUserStory.get('Parent');\n                if (myParentObj != null) {\n                    var myFormattedID = myParentObj.FormattedID;\n                    if (myFormattedID == userStoryFormattedID) {\n                        childrenUserStories.push(myUserStory);\n                    }\n                }\n            }, this);\n\n            for(x in childrenUserStories) {\n                childrenReleases = this._getReleases(childrenUserStories[x], myUserStoryStore);\n                for (x in childrenReleases) {\n                    // releaseRefs.push(childrenReleases[x]);\n                    releaseNames.push(childrenReleases[x]);\n                }\n            }\n        }\n        //return(releaseRefs);\n        return(releaseNames);\n    },\n    \n    //inspect each user story returned from store to determine if it still needs to bin in the store.\n    _inspectUserStories: function(myUserStoryStore, requirementType) {\n        \n        var me=this;\n\n        var PRDStories = new Array();\n        \n        var selectedRelease = me.down('#release-combobox').getRecord();\n        var selectedReleaseName = selectedRelease.get('Name');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n        var selectedReleaseRef = selectedRelease.get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!\n        \n        PRDStories = this._getPRDUserStories(myUserStoryStore, requirementType);\n\n        var numPRDStories = PRDStories.length;\n        var PRDRecords = new Array();\n        var PRDReleases = new Array();\n        for (PRDStory in PRDStories) {\n\n            PRDReleases = this._getReleases(PRDStories[PRDStory], myUserStoryStore);\n            //console.log('PRDReleases for user story ', PRDStories[PRDStory].get('FormattedID'), ' are: ', PRDReleases);\n            PRDReleases = this._arrayUnique(PRDReleases);\n            \n            //if the PRD User Story is implemented in whole or in part in the selected release add it to the store\n            if (this._arrayContains(PRDReleases, selectedReleaseName)) {\n                //formulate data to add to store\n                if (PRDReleases.length > 1) {\n                    note = true;\n                } else {\n                    note = false;\n                }            \n                PRDRecord = {\n                    'UserStory': PRDStories[PRDStory],\n                    'SpansReleases': note\n                };\n                PRDRecords.push(PRDRecord);\n            }\n        }\n        return PRDRecords;\n    },\n\n    _renderRequirementsGrid: function(PRDRecords, requirementType) {\n        \n        if (requirementType == 'PRD') {\n            containerName = '#prd-stories-container';\n            storeId = 'prdUserStoryStore';\n            title = 'Functional Requirements';\n        }\n        if (requirementType == 'NFR') {\n            containerName = '#nfr-stories-container';\n            storeId = 'nfrUserStoryStore';\n            title = 'Non-Functional Requirements';\n        }\n        \n        //this.down(containerName).removeAll();\n        \n        //check value of checkbox for test plan to detemine if we need to add a column for test plan\n        var testPlanCheckboxValue = this.down('#testplan-checkbox').getValue();\n        gridFields = ['FormattedID', 'Name', 'Description', 'MoSCoW'];\n        if (testPlanCheckboxValue == true) {\n            gridFields.push('Test Plan')\n        };\n        \n        if (PRDRecords.length != 0) {\n            \n            //create store to hold the data\n            userStoryStore = Ext.create('Ext.data.Store', {\n                storeId: storeId,\n                fields: gridFields,\n                proxy: {\n                    type: 'memory',\n                    reader: {\n                        type: 'json',\n                        root: 'items'\n                    }\n                }\n            })\n\n            for (x in PRDRecords) {\n                userStory = PRDRecords[x].UserStory;\n\n                PRDRecord = {\n                    'FormattedID': userStory.get('FormattedID'),\n                    'Name': userStory.get('Name'),\n                    'Description': userStory.get('Description'),\n                    'MoSCoW': userStory.get('c_MoSCoW')\n                };\n\n                if (testPlanCheckboxValue == true) {\n                    PRDRecord['Test Plan'] = userStory.get('c_TestPlan');\n                };\n\n                userStoryStore.add(PRDRecord);                \n            }\n\n            gridColumns = [\n                { text: 'FormattedID', dataIndex: 'FormattedID', width: 100},\n                { text: 'Name', dataIndex: 'Name', width: 400, renderer: function(value){\n                    var display = '<p style=\"white-space:normal\">' + value + '</p>';\n                    return display;\n                    }},\n                { text: 'Description', dataIndex: 'Description', flex: 1, renderer: function(value){\n                    var display = '<p style=\"white-space:normal\">' + value + '</p>';\n                    return display;\n                    }},\n                { text: 'MoSCoW', dataIndex: 'MoSCoW', width: 100\n                }\n                ];\n    \n            if (testPlanCheckboxValue == true) {\n                gridColumns.push({text: 'Test Plan', dataIndex: 'Test Plan', width: 400, renderer: function(value){\n                    var display = '<p style=\"white-space:normal\">' + value + '</p>';\n                    return display;\n                    }});\n            };\n\n            //create and display the grid\n            userStoryGrid = Ext.create('Ext.grid.Panel', {\n                title: title,\n                store: Ext.data.StoreManager.lookup(storeId),\n                columns: gridColumns,\n                    renderTo: Ext.getBody()\n            });\n            this.down(containerName).add(userStoryGrid);\n        } else {\n            //there are no user stories to be displayed.  Let's create a simple message to inform the user\n            userStoryLabel = Ext.create('Ext.form.Panel', {\n                title: title,\n                width:400,\n                padding: 10,\n                renderTo: Ext.getBody(),\n                layout: {\n                    type: 'hbox',\n                    align: 'middle'\n                },\n                items: [{\n                    xtype: 'label',\n                    forID: 'myFieldId',\n                    text: 'No user stories with ' + requirementType + ' tag found in selected release!',\n                    margin: '0 0 0 10'\n                }]\n            });\n            this.down(containerName).add(userStoryLabel);\n        }\n    },\n    \n    _arrayUnique: function(a) {\n        return a.reduce(function(p, c) {\n            if (p.indexOf(c) < 0) p.push(c);\n            return p;\n        }, []);\n    },\n\n    _arrayContains: function(a, obj) {\n        for (var i = 0; i < a.length; i++) {\n            if (a[i] === obj) {\n                return true;\n            }\n        }\n        return false;\n    }\n});\n","undoManager":{"mark":98,"position":100,"stack":[[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":184,"column":29},"end":{"row":184,"column":30}},"text":"S"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":29},"end":{"row":184,"column":30}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":184,"column":26},"end":{"row":184,"column":30}},"text":"user"},{"action":"insertText","range":{"start":{"row":184,"column":26},"end":{"row":184,"column":41}},"text":"userStoryFilter"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":41},"end":{"row":184,"column":42}},"text":"."}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":42},"end":{"row":184,"column":43}},"text":"o"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":43},"end":{"row":184,"column":44}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":44},"end":{"row":184,"column":46}},"text":"()"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":45},"end":{"row":184,"column":46}},"text":"u"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":46},"end":{"row":184,"column":47}},"text":"s"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":47},"end":{"row":184,"column":48}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":48},"end":{"row":184,"column":49}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":49},"end":{"row":184,"column":50}},"text":"S"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":50},"end":{"row":184,"column":51}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":51},"end":{"row":184,"column":52}},"text":"o"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":52},"end":{"row":184,"column":53}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":53},"end":{"row":184,"column":54}},"text":"y"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":54},"end":{"row":184,"column":55}},"text":"F"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":55},"end":{"row":184,"column":56}},"text":"i"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":56},"end":{"row":184,"column":57}},"text":"l"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":57},"end":{"row":184,"column":58}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":58},"end":{"row":184,"column":59}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":59},"end":{"row":184,"column":60}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":60},"end":{"row":184,"column":61}},"text":"3"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":62},"end":{"row":184,"column":63}},"text":";"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":184,"column":63},"end":{"row":185,"column":0}},"text":"\n"},{"action":"insertText","range":{"start":{"row":185,"column":0},"end":{"row":185,"column":8}},"text":"        "}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":163,"column":23},"end":{"row":163,"column":29}},"text":"Parent"},{"action":"insertText","range":{"start":{"row":163,"column":23},"end":{"row":163,"column":24}},"text":"D"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":163,"column":24},"end":{"row":163,"column":25}},"text":"i"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":163,"column":25},"end":{"row":163,"column":26}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":163,"column":26},"end":{"row":163,"column":27}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":163,"column":27},"end":{"row":163,"column":28}},"text":"c"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":163,"column":28},"end":{"row":163,"column":29}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":163,"column":23},"end":{"row":163,"column":29}},"text":"Direct"},{"action":"insertText","range":{"start":{"row":163,"column":23},"end":{"row":163,"column":42}},"text":"DirectChildrenCount"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":164,"column":24},"end":{"row":164,"column":25}},"text":"="}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":164,"column":23},"end":{"row":164,"column":24}},"text":"!"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":164,"column":23},"end":{"row":164,"column":24}},"text":">"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":165,"column":22},"end":{"row":165,"column":23}},"text":"l"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":165,"column":21},"end":{"row":165,"column":22}},"text":"l"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":165,"column":20},"end":{"row":165,"column":21}},"text":"u"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":165,"column":19},"end":{"row":165,"column":20}},"text":"n"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":165,"column":19},"end":{"row":165,"column":20}},"text":"0"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":257,"column":68},"end":{"row":258,"column":0}},"text":"\n"},{"action":"insertText","range":{"start":{"row":258,"column":0},"end":{"row":258,"column":10}},"text":"          "}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":10},"end":{"row":258,"column":11}},"text":"m"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":11},"end":{"row":258,"column":12}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":12},"end":{"row":258,"column":13}},"text":"."}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":13},"end":{"row":258,"column":14}},"text":"u"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":14},"end":{"row":258,"column":15}},"text":"s"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":15},"end":{"row":258,"column":16}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":16},"end":{"row":258,"column":17}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":17},"end":{"row":258,"column":18}},"text":"S"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":18},"end":{"row":258,"column":19}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":19},"end":{"row":258,"column":20}},"text":"o"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":20},"end":{"row":258,"column":21}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":21},"end":{"row":258,"column":22}},"text":"y"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":22},"end":{"row":258,"column":23}},"text":"S"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":23},"end":{"row":258,"column":24}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":24},"end":{"row":258,"column":25}},"text":"o"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":25},"end":{"row":258,"column":26}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":26},"end":{"row":258,"column":27}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":27},"end":{"row":258,"column":28}},"text":"."}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":28},"end":{"row":258,"column":29}},"text":"s"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":29},"end":{"row":258,"column":30}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":30},"end":{"row":258,"column":31}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":31},"end":{"row":258,"column":32}},"text":"F"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":258,"column":28},"end":{"row":258,"column":32}},"text":"setF"},{"action":"insertText","range":{"start":{"row":258,"column":28},"end":{"row":258,"column":37}},"text":"setFilter"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":37},"end":{"row":258,"column":39}},"text":"()"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":38},"end":{"row":258,"column":39}},"text":"m"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":39},"end":{"row":258,"column":40}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":40},"end":{"row":258,"column":41}},"text":"."}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":41},"end":{"row":258,"column":42}},"text":"f"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":42},"end":{"row":258,"column":43}},"text":"i"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":43},"end":{"row":258,"column":44}},"text":"l"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":44},"end":{"row":258,"column":45}},"text":"t"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":45},"end":{"row":258,"column":46}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":46},"end":{"row":258,"column":47}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":258,"column":41},"end":{"row":258,"column":47}},"text":"filter"},{"action":"insertText","range":{"start":{"row":258,"column":41},"end":{"row":258,"column":48}},"text":"filters"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":258,"column":49},"end":{"row":258,"column":50}},"text":";"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":258,"column":38},"end":{"row":258,"column":48}},"text":"me.filters"},{"action":"insertText","range":{"start":{"row":258,"column":38},"end":{"row":258,"column":82}},"text":"me._getUserStoryFilters(selectedReleaseName)"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":257,"column":0},"end":{"row":257,"column":68}},"text":"          me.filters = me._getUserStoryFilters(selectedReleaseName);"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":256,"column":30},"end":{"row":257,"column":0}},"text":"\n"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":61},"end":{"row":498,"column":62}},"text":","}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":62},"end":{"row":498,"column":63}},"text":" "}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":63},"end":{"row":498,"column":64}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":64},"end":{"row":498,"column":65}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":65},"end":{"row":498,"column":66}},"text":"n"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":66},"end":{"row":498,"column":67}},"text":"d"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":67},"end":{"row":498,"column":68}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":68},"end":{"row":498,"column":69}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":69},"end":{"row":498,"column":70}},"text":"e"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":70},"end":{"row":498,"column":71}},"text":"r"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":71},"end":{"row":498,"column":72}},"text":":"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":72},"end":{"row":498,"column":73}},"text":" "}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":498,"column":73},"end":{"row":498,"column":89}},"text":"function(value){"},{"action":"insertText","range":{"start":{"row":498,"column":89},"end":{"row":499,"column":0}},"text":"\n"},{"action":"insertLines","range":{"start":{"row":499,"column":0},"end":{"row":501,"column":0}},"lines":["                    var display = '<p style=\"white-space:normal\">' + value + '</p>';","                    return display;"]},{"action":"insertText","range":{"start":{"row":501,"column":0},"end":{"row":501,"column":21}},"text":"                    }"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":188,"column":8},"end":{"row":188,"column":9}},"text":"/"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":188,"column":9},"end":{"row":188,"column":10}},"text":"/"}]}],[{"group":"doc","deltas":[{"action":"removeLines","range":{"start":{"row":186,"column":0},"end":{"row":188,"column":0}},"nl":"\n","lines":["        //userStoryFilter = userStoryFilter.or(hasChildrenFilter);","        //userStoryFilter = userStoryFilter.or(releaseFilter);"]}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":294,"column":22},"end":{"row":294,"column":23}},"text":"/"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":294,"column":23},"end":{"row":294,"column":24}},"text":"/"}]}],[{"group":"doc","deltas":[{"action":"insertText","range":{"start":{"row":294,"column":24},"end":{"row":294,"column":25}},"text":" "}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":294,"column":24},"end":{"row":294,"column":25}},"text":" "}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":295,"column":0},"end":{"row":295,"column":55}},"text":"                      //console.log('myData:', myData);"}]}],[{"group":"doc","deltas":[{"action":"removeText","range":{"start":{"row":294,"column":88},"end":{"row":295,"column":0}},"text":"\n"}]}]]},"ace":{"folds":[],"scrolltop":4283.5,"scrollleft":0,"selection":{"start":{"row":288,"column":20},"end":{"row":288,"column":31},"isBackwards":false},"options":{"guessTabSize":true,"useWrapMode":false,"wrapToView":true},"firstLineState":{"row":266,"state":"start","mode":"ace/mode/javascript"}},"timestamp":1407777777999}