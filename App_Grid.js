Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        var today = new Date().toISOString();
        console.log('test 1')
        Ext.create('Rally.data.wsapi.Store', {
                model: 'UserStory',
                fetch: ['ObjectID', 'FormattedID', 'Name', 'ScheduleState', 'Feature', 'Blocked', 'BlockedReason'],
                autoLoad: true,
                filters: [
                    {
                        property: 'Iteration.StartDate',
                        operator: '<=',
                        value: today
                    },
                    {
                        property: 'Iteration.EndDate',
                        operator: '>=',
                        value: today
                    },
                    {
                        property: 'Feature',
                        operator: '!=',
                        value: null
                    }
                ],
                listeners: {
                    load: this._onDataLoaded,
                    scope: this
                }
                });
    },
    _onDataLoaded: function(store, records){
        var that = this;
        var promises = [];
         _.each(records, function(story) {
            promises.push(that._getFeature(story, that));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log('test 2')
                that._stories = results;
                that._makeGrid();
            }
        });
    },
    
    _getFeature: function(story, scope) {
        var deferred = Ext.create('Deft.Deferred');
        var that = scope;
            var featureOid = story.get('Feature').ObjectID;
            Rally.data.ModelFactory.getModel({
            type: 'PortfolioItem/Feature',
            scope: this,
            success: function(model, operation) {
                fetch: ['FormattedID','State'],
                model.load(featureOid, {
                    scope: this,
                    success: function(record, operation) {
//                        var featureState = record.get('State')._refObjectName;
                        var featureState = 'test';
                        var featureFid = record.get('FormattedID');
                        var storyRef = story.get('_ref');
                        var storyOid  = story.get('ObjectID');
                        var storyFid = story.get('FormattedID');
                        var storyBlocked = story.get('Blocked');
                        var blockedReason = story.get('BlockedReason');
                        var storyName  = story.get('Name');
                        var storyState = story.get('ScheduleState');
                        var feature = story.get('Feature');
                        
                        result = {
                                    "_ref"          : storyRef,
                                    "ObjectID"      : storyOid,
                                    "FormattedID"   : storyFid,
                                    "Name"          : storyName,
                                    "ScheduleState" : storyState,
                                    "Blocked"       : storyBlocked,
                                    "BlockedReason" : blockedReason,
                                    "Feature"       : feature,
                                    "FeatureState"  : featureState,
                                    "FeatureID"     : featureFid  
                                };
                        deferred.resolve(result);    
                    }
                });
            }
        });
        return deferred; 
    },
    
    _makeGrid: function() {
        var that = this;
        console.log(that._stories);
        if (that._grid) {
            that._grid.destroy();
        }

        var gridStore = Ext.create('Rally.data.custom.Store', {
            data: that._stories,
            groupField: 'FeatureID',
            pageSize: 1000,
        });

        that._grid = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'storyGrid',
            store: gridStore,
            features: [{ftype:'grouping'}],
            enableBlockedReasonPopover: false,
            columnCfgs: [
                {
                    text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },

                {
                    text: 'Name', dataIndex: 'Name', 
                },
                {
                    text: 'ScheduleState', dataIndex: 'ScheduleState', xtype: 'templatecolumn',
                        tpl: Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate',
                            {
                                states: ['Defined', 'In-Progress', 'Completed', 'Accepted'],
                                field: {
                                    name: 'ScheduleState' 
                                }
                        })
                },
                {
                    text: 'Blocked', dataIndex: 'Blocked', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.BlockedTemplate')
                },
                
                {
                    text: 'BlockedReason', dataIndex: 'BlockedReason'
                },
                
                {
                    text: 'Feature', dataIndex: 'Feature',
                    renderer: function(val, meta, record) {
                        return '<a href="https://rally1.rallydev.com/#/detail/portfolioitem/feature/' + record.get('Feature').ObjectID + '" target="_blank">' + record.get('Feature').FormattedID + '</a>';
                    }
                },
                {
                    text: 'Feature State', dataIndex: 'FeatureState',
                }
            ]
        });

        that.add(that._grid);
        that._grid.reconfigure(gridStore);
    }
});