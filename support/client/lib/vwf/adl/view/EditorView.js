"use strict";
define( [
        "module", 
        "version", 
        "vwf/view", 
        "vwf/adl/view/editorview/lib/alertify.js-0.3.9/src/alertify", 
        "vwf/adl/view/editorview/Menubar", 
        "vwf/adl/view/editorview/ObjectPools", 
        "vwf/adl/view/editorview/LocationTools", 
        "vwf/adl/view/editorview/WindowResize", 
        "vwf/adl/view/editorview/_PermissionsManager", 
        "vwf/adl/view/editorview/InputSetup", 
        "vwf/adl/view/editorview/SaveLoadTimer", 
        "vwf/adl/view/editorview/TouchHandler", 
        "vwf/adl/view/editorview/SidePanel", 
        "vwf/adl/view/editorview/Toolbar", 
        "vwf/adl/view/editorview/ChatSystemGUI", 
        "vwf/adl/view/editorview/PrimitiveEditor", 
        "vwf/adl/view/editorview/MaterialEditor", 
        "vwf/adl/view/editorview/Notifier", 
        "vwf/adl/view/editorview/ScriptEditor", 
        "vwf/adl/view/editorview/Editor", 
        "vwf/adl/view/editorview/_3DRIntegration", 
        "vwf/adl/view/editorview/InventoryManager", 
        "vwf/adl/view/editorview/HeirarchyManager", 
        "vwf/adl/view/editorview/DataManager", 
        "vwf/adl/view/editorview/UserManager", 
        "vwf/adl/view/editorview/help", 
        "vwf/adl/view/editorview/SideTabs", 
        "vwf/adl/view/editorview/wireeditor", 
        "vwf/adl/view/editorview/selectionEditor", 
        "vwf/adl/view/editorview/UndoManager", 
        "vwf/adl/view/editorview/Publisher", 
        "vwf/adl/view/editorview/EntityLibrary", 
        "vwf/adl/view/editorview/PhysicsEditor"
    ], function(module, version, view) {

    return view.load(module, {
        // == Module Definition ====================================================================
        initialize: function() {





            if (!window._EditorInitialized) {
                jQuery.extend({
                    parseQuerystring: function() {
                        var nvpair = {};
                        var qs = window.location.search.replace('?', '');
                        var pairs = qs.split('&');
                        $.each(pairs, function(i, v) {
                            var pair = v.split('=');
                            nvpair[pair[0]] = pair[1];
                        });
                        return nvpair;
                    }
                });


                console.log('initialize Index-vwf');

                window._DataManager = require("vwf/adl/view/editorview/DataManager").getSingleton();;


                var instanceData = _DataManager.getInstanceData() || {};

                var needTools = instanceData && instanceData.publishSettings ? instanceData.publishSettings.allowTools : true;
                //set the title of the window to the title of the world.
                document.title = instanceData.title;

                window._Editor = require("vwf/adl/view/editorview/Editor").getSingleton();
                if (needTools) {

                    var data = $.ajax('vwf/adl/view/editorview/menus.html', {
                        async: false,
                        dataType: 'html'
                    }).responseText;
                    $(document.body).append(data);
                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/lib/ddsmoothmenu.js"></script>');


                    require("vwf/adl/view/editorview/SidePanel").initialize();
                    //initialize the primitive editor

                    //initialize the primitive editor
                    window._PrimitiveEditor = require("vwf/adl/view/editorview/PrimitiveEditor").getSingleton();
                    window._PhysicsEditor = require("vwf/adl/view/editorview/PhysicsEditor").getSingleton();
                    //initialize the Material editor
                    window._MaterialEditor = require("vwf/adl/view/editorview/MaterialEditor").getSingleton();
                    window._MaterialEditor.hide();
                    window._Notifier = require("vwf/adl/view/editorview/Notifier").getSingleton();
                    window._ScriptEditor = require("vwf/adl/view/editorview/ScriptEditor").getSingleton();;
                    window._ModelLibrary = require("vwf/adl/view/editorview/_3DRIntegration").getSingleton();
                    window._Publisher = require("vwf/adl/view/editorview/Publisher").getSingleton();
                    window._InventoryManager = require("vwf/adl/view/editorview/InventoryManager").getSingleton();;
                    window.HierarchyManager = require("vwf/adl/view/editorview/HeirarchyManager").getSingleton();;
                    window._PermissionsManager = require("vwf/adl/view/editorview/_PermissionsManager").getSingleton();
                    window._WireEditor = require("vwf/adl/view/editorview/wireeditor").getSingleton();
                    window._SelectionEditor = require("vwf/adl/view/editorview/selectionEditor").getSingleton();
                    window._UndoManager = require("vwf/adl/view/editorview/UndoManager").getSingleton();
                    window._EntityLibrary = require("vwf/adl/view/editorview/EntityLibrary").getSingleton();
                    this.addManager(_ScriptEditor);
                    this.addManager(_UndoManager);
                    this.addManager(_ModelLibrary);
                    this.addManager(_Notifier);
                    this.addManager(_MaterialEditor);
                    this.addManager(_PrimitiveEditor);
                    this.addManager(_InventoryManager);
                    this.addManager(_PermissionsManager);
                    this.addManager(_WireEditor);
                    this.addManager(HierarchyManager);
                    this.addManager(_Publisher);
                    this.addManager(_EntityLibrary);
                }
                window._LocationTools = require("vwf/adl/view/editorview/LocationTools").getSingleton();
                window._UserManager = require("vwf/adl/view/editorview/UserManager").getSingleton();;


                if (needTools) {
                    require("vwf/adl/view/editorview/help").getSingleton();

                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/PainterTool.js"></script>');

                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/AlignTool.js"></script>');

                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/SplineTool.js"></script>');
                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/TerrainTool.js"></script>');

                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/lib/jquery.qtip-1.0.0-rc3.min.js"></script>');
                    $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/lib/beautify.module.js"></script>');
                }

                $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/sha256.js"></script>');
                $(document.head).append('<script type="text/javascript" src="vwf/adl/view/editorview/lib/jquery.ui.touch-punch.min.js"></script>');

                require("vwf/adl/view/editorview/WindowResize").initialize();
                $('input[type="text"]').keypress(function(e) {
                    e.stopImmediatePropagation();
                });


                this.addManager(_UserManager);
                this.addManager(_DataManager);
                this.addManager(_Editor);



            }
        },
        managers: [], //list of objects that need notification of events
        addManager: function(manager) {
            this.managers.push(manager);
            manager.sendMessage = this.sendMessage;
            manager.getParent = function() {
                return this;
            }.bind(this);

        },
        //actual sending of messages. Stops and returns when a manager returns a value
        _sendMessage: function(message, data, sender) {

            for (var i = 0; i < this.managers.length; i++) {
                var manager = this.managers[i];
                if (manager[message] && (typeof manager[message] == "function")) {
                    var tret = null;
                    if (data && data.constructor == Array)
                        tret = manager[message].apply(manager, data);
                    else
                        tret = manager[message].apply(manager, [data]);
                    return tret;
                } else if (manager.receiveMessage) {
                    var tret = manager.receiveMessage(message, data, sender);
                    if (tret)
                        return tret;
                }
            }
            return null;
        },
        //handle that is applied to each registered manager, allowing them to send messages over the bus
        /* message,data */
        sendMessage: function( /* message,data */ ) {
            var args = []
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            var message = args.shift();
            return this.getParent()._sendMessage(message, args, this);
        },
        // send the VWF events down to all registered objects
        viewAPINotify: function(functionName, data) {
            for (var i = 0; i < this.managers.length; i++) {
                var manager = this.managers[i];
                if (manager[functionName]) {
                    manager[functionName].apply(manager, data)
                }
            }
        },
        createdNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childURI, childName, callback /* ( ready ) */ ) {

            this.viewAPINotify('createdNode', arguments);
        },

        initializedNode: function(nodeID, childID) {
            this.viewAPINotify('initializedNode', arguments);
            if (childID == 'index-vwf') {
                if (window._Editor) {
                    _Editor.initialize();
                    InitializeEditor();
                    //disable text selection on the entire page, except for input elements and draggables
                    $('body *').not(':has(input)').not('[draggable]').not('input').disableSelection();
                    //enable selection on the ancestors of all draggables, to make drag work in FF
                    $('[draggable]').parentsUntil().enableSelection();

                }

            }
            if (window._Editor && childID != 'index-vwf') {
                if (window._Editor.createNodeCallback != null) {
                    window._Editor.CallCreateNodeCallback(childID, nodeID, vwf.name(childID));
                }
            }
        },
        createdProperty: function(nodeID, propertyName, propertyValue) {
            this.viewAPINotify('createdProperty', arguments);
        },
        initializedProperty: function(nodeID, propertyName, propertyValue) {
            this.viewAPINotify('initializedProperty', arguments);
        },
        deletedNode: function(nodeID) {
            this.viewAPINotify('deletedNode', arguments);
            if (window._Editor && _Editor.SelectedVWFID == nodeID) {
                _Editor.SelectObject(null);
            }
        },
        satProperty: function(nodeID, propertyName, propertyValue) {
            this.viewAPINotify('satProperty', [nodeID, propertyName, propertyValue]);
            if (window._Editor && propertyName == _Editor.transformPropertyName && _Editor.isSelected(nodeID)) {
                _Editor.updateBoundsTransform(nodeID);
                if (vwf.client() == vwf.moniker()) {
                    if (_Editor.waitingForSet.length)
                        _Editor.waitingForSet.splice(_Editor.waitingForSet.indexOf(nodeID), 1);

                }
                if (_Editor.waitingForSet.length == 0 || vwf.client() != vwf.moniker()) {
                    _Editor.updateGizmoLocation();
                    _Editor.updateGizmoSize();
                    _Editor.updateGizmoOrientation(false);
                }
                $(document).trigger('selectionTransformedLocal', [{
                    id: nodeID
                }]);
            }

            if (window._PrimitiveEditor)
                _PrimitiveEditor.NodePropertyUpdate(nodeID, propertyName, propertyValue);
        },
        createdMethod: function(nodeID, methodName, methodParameters, methodBody) {
            this.viewAPINotify('createdMethod', arguments);
        },
        calledMethod: function(nodeID, methodName, methodParameters) {
            this.viewAPINotify('calledMethod', arguments);
        },
        createdEvent: function(nodeID, eventName, eventParameters) {
            this.viewAPINotify('createdEvent', arguments);
        },
        firedEvent: function(nodeID, eventName, eventParameters) {
            this.viewAPINotify('firedEvent', arguments);
        },
        executed: function(nodeID, scriptText, scriptType) {
            this.viewAPINotify('executed', arguments);
        },
    });
});

function InitializeEditor() {

    var instanceData = _DataManager.getInstanceData() || {};
    var needTools = instanceData && instanceData.publishSettings ? instanceData.publishSettings.allowTools : true;

    document._UserManager = _UserManager;
    $('#vwf-root').css('overflow', 'hidden');
    $(document.body).css('font-size', '10px');
    $('#tabs').css('z-index', '101');
    $('#AvatarChoice').buttonset();
    $('#vwf-root').attr('tabindex', '0');
    vwf.logger.level = 6;
    if (document.Players) {
        for (var i = 0; i < document.Players.length; i++) {
            _UserManager.PlayerCreated(document.Players[i]);
        }
    }

    require("vwf/adl/view/editorview/InputSetup").initialize();

    if (needTools) {
        $('#sidepanel').css('height', $(window).height() - ($('#statusbar').height() + $('#toolbar').height() + $('#smoothmenu1').height()) + 'px')
        $('#sidepanel').jScrollPane();
        require("vwf/adl/view/editorview/Toolbar").initialize();

        require("vwf/adl/view/editorview/Menubar").initialize();
        require("vwf/adl/view/editorview/SideTabs").initialize();
        require("vwf/adl/view/editorview/ChatSystemGUI").initialize();
        $(document.head).append('<script type="text/javascript" src="vwf/view/localization/translate.js"></script>');
        translateMenu();
        //default to select mode
        _Editor.SetSelectMode('Pick');
    }
    require("vwf/adl/view/editorview/SaveLoadTimer").initialize();

    require("vwf/adl/view/editorview/TouchHandler").initialize();

    $(document.body).css('overflow', 'hidden');
    $(window).resize();

    //	$('body *').not(':has(input)').not('input').disableSelection();
    //	$('#vwf-root').enableSelection();
    //	$('#vwf-root').parent().enableSelection();
    //	$('#vwf-root').parent().parent().enableSelection();
    //	$('#index-vwf').enableSelection();
    //	$('* :not(input)').disableSelection();

    //localization


}

function PlayerDeleted(e) {
    $("#" + e + "label").remove();
}

function GUID() {
    var S4 = function() {
        return Math.floor(Math.SecureRandom() * 0x10000 /* 65536 */ ).toString(16);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}