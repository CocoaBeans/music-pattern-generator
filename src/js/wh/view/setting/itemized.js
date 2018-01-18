import createBaseSettingView from './base';

/**
 * Processor setting view for a itemized type parameter,
 * which has a radio buttons for item selection.
 */
export default function createItemizedSettingView(specs, my) {
    var that,
        radioInputs = [],
        numInputs,
        
        init = function() {
            let parentEl = my.el.parentNode;
            
            // add the main label
            let label = my.el.querySelector('.setting__label-text');
            parentEl.appendChild(label);
            
            // add the radio buttons
            let radioTemplate = document.querySelector('#template-setting-itemized-item'),
                model = my.param.model;
            numInputs = model.length;
            for (var i = 0; i < numInputs; i++) {
                let id = getTemporaryInputAndLabelId();
                
                // add a new cloned radio element
                let radioInputEl = radioTemplate.content.children[0].cloneNode(true);
                parentEl.appendChild(radioInputEl);
                radioInputEl.setAttribute('name', specs.key);
                radioInputEl.setAttribute('id', id);
                radioInputEl.value = model[i].value;
                radioInputEl.checked = model[i].value == my.param.default;
                radioInputEl.addEventListener('change', onChange);
                radioInputs.push(radioInputEl);
                
                // add a new cloned label element
                let radioLabelEl = radioTemplate.content.children[1].cloneNode(true);
                parentEl.appendChild(radioLabelEl);
                radioLabelEl.setAttribute('for', id);
                radioLabelEl.innerHTML = model[i].label;
            }
            
            // remove the original element
            parentEl.removeChild(my.el);
            
            // my.param.addChangedCallback(changedCallback);
        },
        
        /**
         * A quick ID to tie label to input elements.
         * @return {Number} Unique ID.
         */
        getTemporaryInputAndLabelId = function() {
            return 'id' + Math.random() + performance.now();
        },
        
        onChange = function(e) {
            my.param.setValue(e.target.value);
        },
        
        changedCallback = function(parameter, oldValue, newValue) {
            for (i = 0; i < numInputs; i++) {
                radioInputs[i].checked = (radioInputs[i].value == newValue);
            }
        };
        
    my = my || {};
    
    that = createBaseSettingView(specs, my);
    
    init();
    
    return that;
}