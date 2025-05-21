import { AnchorPoint } from './AnchorPoint.js';
import { generateUUID } from '../core/utils.js';

export const NODE_UI_CONFIG = {
    ANCHOR_WIDTH_PX: 14,
    ANCHOR_HEIGHT_PX: 14,
    ANCHOR_VERTICAL_GAP_PX: 10,
    NODE_EDGE_PADDING_FOR_ANCHORS_PX: 15,
    DEFAULT_NODE_WIDTH_PX: 220,
    NODE_MIN_HEIGHT_PX: 150,
    HEADER_HEIGHT_PX: 36,
    TOOLTIP_DELAY_MS: 1000,
};

export class NodeInstance {
    constructor(componentDefinition, x, y, appConfigOverrides = {}) {
        this.config = { ...NODE_UI_CONFIG, ...appConfigOverrides };

        this.instanceId = generateUUID();
        this.componentAddress = componentDefinition.global_address;
        this.name = componentDefinition.name;
        this.nickName = componentDefinition.nickName;
        this.description = componentDefinition.description;
        this.libraryName = componentDefinition.libraryName;
        this.category = componentDefinition.category;
        this.subCategory = componentDefinition.subCategory;
        this.uiType = componentDefinition.uiType || 'node';

        this.x = x;
        this.y = y;
        this.width = this.config.DEFAULT_NODE_WIDTH_PX;
        this.height = this.config.NODE_MIN_HEIGHT_PX;
        this.fx = null;
        this.fy = null;
        this.isUserDragged = false;
        this.isUserDraggedPersistently = false;

        this.inputs = [];
        this.outputs = [];
        this.componentDefinition = componentDefinition;

        this.domElement = null;
        this.nodeElement = null;
        this.headerElement = null;
        this.bodyElement = null;
        this.inputsContainerElement = null;
        this.outputsContainerElement = null;
        this.definitionTooltipElement = null;
        this.nodeHoverTimer = null;

        this.generateAnchors();
    }

    generateAnchors() {
        if (this.componentDefinition.inputs && Array.isArray(this.componentDefinition.inputs)) {
            this.componentDefinition.inputs.forEach((inputDef, index) => {
                this.inputs.push(new AnchorPoint(this.instanceId, inputDef, "input", index));
            });
        }
        if (this.componentDefinition.outputs && Array.isArray(this.componentDefinition.outputs)) {
            this.componentDefinition.outputs.forEach((outputDef, index) => {
                this.outputs.push(new AnchorPoint(this.instanceId, outputDef, "output", index));
            });
        }
    }

    getAnchorByDefAddress(defAddress) {
        const allAnchors = [...this.inputs, ...this.outputs];
        return allAnchors.find(a => a.definitionAddress === defAddress);
    }

    updatePosition(newX, newY) {
        this.x = newX;
        this.y = newY;
        if (this.domElement) {
            this.domElement.style.left = `${this.x}px`;
            this.domElement.style.top = `${this.y}px`;
        }
    }

    createDomStructure() {
        this.domElement = document.createElement('div');
        this.domElement.className = 'gh-node-container';
        this.domElement.id = `container-${this.instanceId}`;
        this.domElement.dataset.id = this.instanceId;


        this.nodeElement = document.createElement('div');
        this.nodeElement.className = 'gh-node';
        this.nodeElement.id = this.instanceId;


        this.headerElement = document.createElement('div');
        this.headerElement.className = 'gh-node-header';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'gh-node-title';
        const iconDiv = document.createElement('div');
        iconDiv.className = 'gh-node-icon';
        iconDiv.innerHTML = `<svg viewBox="0 0 24 24">${this.getIconPath(this.category)}</svg>`;
        const titleSpan = document.createElement('span');
        titleSpan.textContent = this.nickName || this.name;
        titleDiv.appendChild(iconDiv);
        titleDiv.appendChild(titleSpan);
        this.headerElement.appendChild(titleDiv);

        this.bodyElement = document.createElement('div');
        this.bodyElement.className = 'gh-node-body';

        const categoryTag = document.createElement('div');
        categoryTag.className = 'node-category';
        categoryTag.textContent = `${this.category}.${this.subCategory}`;
        this.bodyElement.appendChild(categoryTag);

        const libTag = document.createElement('div');
        libTag.className = 'node-lib-tag';
        const libName = this.libraryName || 'DefaultLib';
        libTag.textContent = libName.length > 15 ? libName.substring(0,12) + '...' : libName;
        this.bodyElement.appendChild(libTag);

        const contentArea = document.createElement('div');
        contentArea.className = 'node-content-area';
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'node-description';
        descriptionDiv.textContent = this.description || 'No description available.';
        contentArea.appendChild(descriptionDiv);
        this.bodyElement.appendChild(contentArea);

        this.inputsContainerElement = document.createElement('div');
        this.inputsContainerElement.className = 'node-side-connectors inputs';
        this.bodyElement.appendChild(this.inputsContainerElement);

        this.outputsContainerElement = document.createElement('div');
        this.outputsContainerElement.className = 'node-side-connectors outputs';
        this.bodyElement.appendChild(this.outputsContainerElement);

        this.nodeElement.appendChild(this.headerElement);
        this.nodeElement.appendChild(this.bodyElement);
        this.createDefinitionTooltip();
        this.nodeElement.appendChild(this.definitionTooltipElement);

        this.domElement.appendChild(this.nodeElement);
    }

    createDefinitionTooltip() {
        this.definitionTooltipElement = document.createElement('div');
        this.definitionTooltipElement.className = 'node-definition-tooltip';
        let inputsHtml = this.inputs.map(inp => `<div class="tooltip-info">${inp.nickName} (${inp.name}): ${inp.typeName}</div>`).join('');
        let outputsHtml = this.outputs.map(out => `<div class="tooltip-info">${out.nickName} (${out.name}): ${out.typeName}</div>`).join('');

        this.definitionTooltipElement.innerHTML = `
            <div class="tooltip-header">
                <div class="tooltip-icon"><svg viewBox="0 0 24 24">${this.getIconPath(this.category)}</svg></div>
                <div class="tooltip-title">${this.name} (${this.nickName || ''})</div>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-description">${this.description || 'No description available.'}</div>
                <div class="tooltip-code-block">
                    <div class="tooltip-info"><strong>Library:</strong> ${this.libraryName}</div>
                    <div class="tooltip-info"><strong>Address:</strong> ${this.componentAddress}</div>
                    ${inputsHtml ? `<div class="tooltip-info" style="margin-top:5px;"><strong>Inputs:</strong></div>${inputsHtml}` : ''}
                    ${outputsHtml ? `<div class="tooltip-info" style="margin-top:5px;"><strong>Outputs:</strong></div>${outputsHtml}` : ''}
                </div>
            </div>`;
    }

    attachTooltipEvents() {
        if (!this.nodeElement) return;
        this.nodeElement.addEventListener('mouseenter', () => {
            this.nodeHoverTimer = setTimeout(() => {
                if (this.nodeElement) this.nodeElement.classList.add('show-definition-tooltip');
            }, this.config.TOOLTIP_DELAY_MS);
        });
        this.nodeElement.addEventListener('mouseleave', () => {
            clearTimeout(this.nodeHoverTimer);
            if (this.nodeElement) this.nodeElement.classList.remove('show-definition-tooltip');
        });
    }

    renderAnchors(addAnchorEventListenersCallback) {
        if (!this.nodeElement || !this.inputsContainerElement || !this.outputsContainerElement) return;

        const inputCount = this.inputs.length;
        const outputCount = this.outputs.length;
        const maxAnchorsOneSide = Math.max(inputCount, outputCount, 0);

        let requiredBodyMinHeight = this.config.NODE_EDGE_PADDING_FOR_ANCHORS_PX * 2;
        if (maxAnchorsOneSide > 0) {
            requiredBodyMinHeight += (maxAnchorsOneSide * this.config.ANCHOR_HEIGHT_PX) +
                                     ((maxAnchorsOneSide - 1) * this.config.ANCHOR_VERTICAL_GAP_PX);
        }

        const contentArea = this.bodyElement.querySelector('.node-content-area');
        const contentHeight = contentArea ? contentArea.scrollHeight : 0;
        const minBodyHeightFromContent = contentHeight + (this.config.NODE_EDGE_PADDING_FOR_ANCHORS_PX);

        const finalBodyHeight = Math.max(
            this.config.NODE_MIN_HEIGHT_PX - this.config.HEADER_HEIGHT_PX,
            requiredBodyMinHeight,
            minBodyHeightFromContent,
            30
        );
        this.height = this.config.HEADER_HEIGHT_PX + finalBodyHeight;
        this.nodeElement.style.height = `${this.height}px`;


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

                const tooltipEl = document.createElement('div');
                tooltipEl.className = 'anchor-tooltip';
                tooltipEl.textContent = `${anchor.name} (${anchor.typeName})`;

                wrapper.appendChild(anchorEl);
                wrapper.appendChild(tooltipEl);
                containerElement.appendChild(wrapper);

                anchor.relX = (anchor.type === 'input') ? 0 : this.width;
                const anchorDOMRect = anchorEl.getBoundingClientRect();
                const nodeDOMRect = this.nodeElement.getBoundingClientRect();
                anchor.relY = (anchorDOMRect.top + anchorDOMRect.height / 2) - (nodeDOMRect.top + this.config.HEADER_HEIGHT_PX);


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
            if (workspaceElement && this.domElement) {
                 workspaceElement.appendChild(this.domElement);
            }
            if (addDragListenersCallback && this.domElement) {
                 addDragListenersCallback(this.domElement, this);
            }
            this.attachTooltipEvents();
        }

        let nodeSizeClass = 'node-small';
        const totalIO = this.inputs.length + this.outputs.length;
        if (totalIO > 6) {
            nodeSizeClass = 'node-large';
        } else if (totalIO > 3) {
            nodeSizeClass = 'node-medium';
        }

        if (this.nodeElement) {
            this.nodeElement.classList.remove('node-small', 'node-medium', 'node-large');
            this.nodeElement.classList.add(nodeSizeClass);
            this.width = parseFloat(getComputedStyle(this.nodeElement).width) || this.config.DEFAULT_NODE_WIDTH_PX;
        }


        this.updatePosition(this.x, this.y);
        this.renderAnchors(addAnchorEventListenersCallback);
    }


    getIconPath(category) {
        const icons = {
            'Mesh': 'M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z',
            'Rhino': 'M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z',
            'PanelingTools': 'M3,3H21V21H3V3M7.33,6L10,10H5V6H7.33M5,16V12H10L7.33,16H5M16.67,16L14,12H19V16H16.67M19,10H14L16.67,6H19V10Z',
            'Kangaroo2': 'M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,20C7.58,20 4,16.42 4,12C4,7.58 7.58,4 12,4C16.42,4 20,7.58 20,12C20,16.42 16.42,20 12,20M15.5,11C16.33,11 17,10.33 17,9.5C17,8.67 16.33,8 15.5,8C14.67,8 14,8.67 14,9.5C14,10.33 14.67,11 15.5,11M8.5,11C9.33,11 10,10.33 10,9.5C10,8.67 9.33,8 8.5,8C7.67,8 7,8.67 7,9.5C7,10.33 7.67,11 8.5,11M12,17.5C14.33,17.5 16.31,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5Z',
            'Default': 'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z'
        };
        return icons[this.category] || icons['Default'];
    }

    remove(activeConnectionsMap) {
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
            this.nodeElement = null;
        }
        const connectionsToRemove = [];
        for (const connId in activeConnectionsMap) {
            if (Object.prototype.hasOwnProperty.call(activeConnectionsMap, connId)) {
                if (activeConnectionsMap[connId].sourceNodeInstanceId === this.instanceId ||
                    activeConnectionsMap[connId].targetNodeInstanceId === this.instanceId) {
                    connectionsToRemove.push(connId);
                }
            }
        }
        connectionsToRemove.forEach(connId => {
            if (activeConnectionsMap[connId] && activeConnectionsMap[connId].removeDomElement) {
                 activeConnectionsMap[connId].removeDomElement();
                 delete activeConnectionsMap[connId];
            }
        });
    }
}