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
        }
    ],
    
    defectStore: undefined,       // app level references to the store and grid for easy access in various methods
    defectGrid: undefined,

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

        me.down('#pulldown-container').add(releaseComboBox);
     },

    // Get data from Rally
    _loadData: function() {
        
        var me = this;
        var releaseRecord = me.down('#release-combobox').getRecord();
        
        console.log('Selected Release:', releaseRecord);

        var selectedReleaseRef = me.down('#release-combobox').getRecord().get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
        var releaseName = selectedReleaseRef.getName();
        
        console.log('release reference:', selectedReleaseRef);
        console.log('release name:', releaseName);
        
    },
    // Get data from Rally
    _loadData: function() {
        var me = this;

      var selectedReleaseRef = me.down('#release-combobox').getRecord().get('_ref');              // the _ref is unique, unlike the iteration name that can change; lets query on it instead!

      // if store exists, just load new data
      if (me.iterationStore) {
        console.log('store exists');
//        me.iterationStore.setFilter(myFilters);
        me.iterationStore.load();

      // create store
      } else {
        console.log('creating store');
        me.iterationStore = Ext.create('Rally.data.wsapi.Store', {     // create defectStore on the App (via this) so the code above can test for it's existence!
          model: 'Iteration',
          autoLoad: true,                         // <----- Don't forget to set this to true! heh
//          filters: myFilters,
          listeners: {
              load: function(myStore, myData, success) {
                  console.log('got data!', myStore, myData);
                  if (!me.iterationGrid) {           // only create a grid if it does NOT already exist
                    me._createIterationGrid(myStore);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.
                  }
              },
              scope: me                         // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'State']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },

    // Create and Show a Grid of given iterations
    _createIterationGrid: function(myIterationStore) {

      this.iterationGrid = Ext.create('Rally.ui.grid.Grid', {
        store: myIterationStore,
        columnCfgs: [         // Columns to display; must be the same names specified in the fetch: above in the wsapi data store
          'Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'State'
        ]
      });

      this.add(this.iterationGrid);       // add the grid Component to the app-level Container (by doing this.add, it uses the app container)

    }

});
