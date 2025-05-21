import { NodeInstance } from './NodeInstance.js';
import { generateUUID } from '../core/utils.js';

const VALUE_DISPLAY_CONFIG_DEFAULTS = {
    ANCHOR_WIDTH_PX: 12,
    ANCHOR_HEIGHT_PX: 12,
    NODE_WIDTH_PX: 220,
    NODE_HEIGHT_PX: 28,
    HEADER_HEIGHT_PX: 0,
};

export class ValueDisplayInstance extends NodeInstance {
    constructor(componentDefinition, x, y, appConfig = VALUE_DISPLAY_CONFIG_DEFAULTS) {
        super(componentDefinition, x, y, { ...NODE_CONFIG_DEFAULTS, ...appConfig, ...VALUE_DISPLAY_CONFIG_DEFAULTS });
        this.uiType = "valueDisplay";
        this.width = this.config.NODE_WIDTH_PX;
        this.height = this.config.NODE_HEIGHT_PX;
        this.currentValue = componentDefinition.defaultValue !== undefined ? componentDefinition.defaultValue : 0.000;
    }

    createDomStructure() {
        this.domElement = document.createElement('div');
        this.domElement.className = 'gh-value-display-container';
        this.domElement.id = `container-${this.instanceId}`;
        this.domElement.dataset.id = this.instanceId;

        this.nodeElement = document.createElement('div');
        this.nodeElement.className = 'gh-value-display';
        this.nodeElement.id = this.instanceId;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'value-display-label';
        labelDiv.textContent = this.nickName || 'Value';
        this.nodeElement.appendChild(labelDiv);

        const trackContainer = document.createElement('div');
        trackContainer.className = 'value-display-track-container';
        const valueTextDiv = document.createElement('div');
        valueTextDiv.className = 'value-display-text';
        valueTextDiv.id = `value-text-${this.instanceId}`;
        valueTextDiv.textContent = parseFloat(this.currentValue).toFixed(3);
        trackContainer.appendChild(valueTextDiv);
        this.nodeElement.appendChild(trackContainer);

        this.createDefinitionTooltip();
        this.nodeElement.appendChild(this.definitionTooltipElement);

        this.domElement.appendChild(this.nodeElement);

        this.inputsContainerElement = document.createElement('div');
        this.inputsContainerElement.className = 'node-side-connectors inputs';
        this.nodeElement.appendChild(this.inputsContainerElement);

        this.outputsContainerElement = document.createElement('div');
        this.outputsContainerElement.className = 'node-side-connectors outputs';
        this.nodeElement.appendChild(this.outputsContainerElement);

    }
    
    renderAnchors(addAnchorEventListenersCallback) {
        this.inputsContainerElement.innerHTML = '';
        this.outputsContainerElement.innerHTML = '';

        const createAnchorDOMElements = (anchorArray, containerElement) => {
            anchorArray.forEach((anchor) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'connector-wrapper';

                const anchorEl = document.createElement('div');
                anchorEl.className = `connector`;
                anchorEl.id = anchor.elementId;
                anchorEl.textContent = anchor.nickName ? anchor.nickName.charAt(0).toUpperCase() : '?';
                anchorEl.dataset.portId = anchor.definitionAddress;
                anchorEl.dataset.portType = anchor.type;
                anchorEl.style.width = `${this.config.ANCHOR_WIDTH_PX}px`;
                anchorEl.style.height = `${this.config.ANCHOR_HEIGHT_PX}px`;
                anchorEl.style.fontSize = '7px';


                const tooltipEl = document.createElement('div');
                tooltipEl.className = 'connector-tooltip';
                tooltipEl.textContent = `${anchor.name} (${anchor.typeName})`;

                wrapper.appendChild(anchorEl);
                wrapper.appendChild(tooltipEl);
                containerElement.appendChild(wrapper);

                anchor.relY = (this.height - this.config.ANCHOR_HEIGHT_PX) / 2;
                if (anchor.type === 'input') {
                    anchor.relX = (-this.config.ANCHOR_WIDTH_PX / 2);
                    containerElement.style.left = `${anchor.relX}px`;
                } else {
                    anchor.relX = (this.width - this.config.ANCHOR_WIDTH_PX / 2);
                    containerElement.style.right = `${-this.config.ANCHOR_WIDTH_PX / 2}px`;
                }
                containerElement.style.top = `calc(50% - ${containerElement.offsetHeight/2}px)`;


                if (addAnchorEventListenersCallback) {
                    addAnchorEventListenersCallback(anchorEl, this.instanceId, anchor.definitionAddress, anchor.type);
                }
            });
        };

        createAnchorDOMElements(this.inputs, this.inputsContainerElement);
        createAnchorDOMElements(this.outputs, this.outputsContainerElement);
    }


    draw(workspaceElement, addDragListenersCallback, addAnchorEventListenersCallback) {
        if (!this.domElement) {
            this.createDomStructure();
            if (workspaceElement) workspaceElement.appendChild(this.domElement);
            if (addDragListenersCallback) addDragListenersCallback(this.domElement, this);
            this.attachTooltipEvents();
        }
        this.nodeElement.style.width = `${this.width}px`;
        this.nodeElement.style.height = `${this.height}px`;
        this.updatePosition(this.x, this.y);
        this.renderAnchors(addAnchorEventListenersCallback);
    }

    updateDisplayedValue(newValue) {
        this.currentValue = parseFloat(newValue);
        const valueTextElement = this.nodeElement.querySelector(`#value-text-${this.instanceId}`);
        const tooltipValueElement = this.definitionTooltipElement.querySelector(`#tooltip-value-${this.instanceId}`);
        if (valueTextElement) {
            valueTextElement.textContent = this.currentValue.toFixed(3);
        }
        if (tooltipValueElement) {
             const valueLine = Array.from(tooltipValueElement.parentElement.querySelectorAll('.tooltip-info')).find(el => el.textContent.startsWith('Value:'));
            if(valueLine) valueLine.textContent = `Value: ${this.currentValue.toFixed(3)}`;
        }
    }
}