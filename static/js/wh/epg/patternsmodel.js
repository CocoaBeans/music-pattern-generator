/**
 * @description Patterns modele.
 * @author Wouter Hisschemöller
 * @version 0.0.0
 * 
 * @namespace WH.epg
 */
 
 window.WH = window.WH || {};
 window.WH.epg = window.WH.epg || {};

(function (ns) {
    
    function createPattern(specs) {
        var that,
            position = specs.position || 0,
            duration = specs.duration || 0,
            
            /**
             * 
             */
            updateEuclid = function(steps, fills, rotation) {
                // construct euclidean pattern
                // add pattern to current sequence on current channel (or new channel) in arrangement
            };
        
        that = {};
        
        updateEuclid(steps, fills, rotation);
        
        return that;
    }
    
    function createPatternsModel() {
        var that,
            patterns = [],
            numPatterns = patterns.length,
            
            /**
             * Clock pulse.
             * @param {Object} clockData Data from clock.
             * @param {Number} clockData.runTimeDuration
             */
            onClock = function(clockData) {
                var i,
                    pattern;
                for (i = 0; i < numPatterns; i++) {
                    pattern = patterns[i];
                }
            }, 
            
            /**
             * Create a pattern and add it to the list.
             */
            createPattern = function(data) {
                patterns.push(createPattern(data));
                // data contains euclidean settings
            },
            
            getPattern = function(index) {
                return patterns[index];
            };
        
        that = {};
        
        that.onClock = onClock;
        that.createPattern = createPattern;
        return that;
    }

    ns.createPatternsModel = createPatternsModel;

})(WH.epg);
