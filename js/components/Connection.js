import { NODE_UI_CONFIG } from './NodeInstance.js';

export class Connection {
    constructor(sourceNodeInstanceId, sourceAnchorDefinitionAddress, targetNodeInstanceId, targetAnchorDefinitionAddress) {
        this.connectionId = `conn-${sourceNodeInstanceId.substring(0,4)}-${targetNodeInstanceId.substring(0,4)}-${Date.now().toString().slice(-4)}`;
        this.sourceNodeInstanceId = sourceNodeInstanceId;
        this.sourceAnchorDefinitionAddress = sourceAnchorDefinitionAddress;
        this.targetNodeInstanceId = targetNodeInstanceId;
        this.targetAnchorDefinitionAddress = targetAnchorDefinitionAddress;
        this.wireElement = null;
        this.isSecondary = false;
    }

    getAnchorPositions(activeNodeInstances) {
        const sourceNode = activeNodeInstances[this.sourceNodeInstanceId];
        const targetNode = activeNodeInstances[this.targetNodeInstanceId];

        if (!sourceNode || !targetNode) {
            console.warn(`Connection ${this.connectionId}: Source or target node not found.`);
            return null;
        }

        const sourceAnchor = sourceNode.getAnchorByDefAddress(this.sourceAnchorDefinitionAddress);
        const targetAnchor = targetNode.getAnchorByDefAddress(this.targetAnchorDefinitionAddress);

        if (!sourceAnchor || !targetAnchor) {
            console.warn(`Connection ${this.connectionId}: Source or target anchor definition not found.`);
            return null;
        }

        const sourceAnchorCenterX = sourceNode.x + sourceAnchor.relX + (sourceAnchor.width || NODE_UI_CONFIG.ANCHOR_WIDTH_PX) / 2;
        const sourceAnchorCenterY = sourceNode.y + sourceAnchor.relY + (sourceAnchor.height || NODE_UI_CONFIG.ANCHOR_HEIGHT_PX) / 2;

        const targetAnchorCenterX = targetNode.x + targetAnchor.relX + (targetAnchor.width || NODE_UI_CONFIG.ANCHOR_WIDTH_PX) / 2;
        const targetAnchorCenterY = targetNode.y + targetAnchor.relY + (targetAnchor.height || NODE_UI_CONFIG.ANCHOR_HEIGHT_PX) / 2;

        return {
            start: { x: sourceAnchorCenterX, y: sourceAnchorCenterY },
            end:   { x: targetAnchorCenterX, y: targetAnchorCenterY }
        };
    }

    draw(svgLayer, activeNodeInstances, selectedNodeIdsSet) {
        if (!this.wireElement) {
            this.wireElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.wireElement.classList.add('wire');
            if (this.isSecondary) {
                this.wireElement.classList.add('secondary');
            }
            this.wireElement.dataset.connectionId = this.connectionId;
            svgLayer.appendChild(this.wireElement);
        }

        const positions = this.getAnchorPositions(activeNodeInstances);
        if (positions) {
            const { start, end } = positions;
            const dx = Math.abs(end.x - start.x);
            let cp1x, cp1y, cp2x, cp2y;

            const sourceNode = activeNodeInstances[this.sourceNodeInstanceId];
            const sourceAnchor = sourceNode.getAnchorByDefAddress(this.sourceAnchorDefinitionAddress);

            if (sourceAnchor.type === 'output') {
                 cp1x = start.x + dx * 0.6;
                 cp1y = start.y;
                 cp2x = end.x - dx * 0.6;
                 cp2y = end.y;
            } else {
                 cp1x = start.x - dx * 0.6;
                 cp1y = start.y;
                 cp2x = end.x + dx * 0.6;
                 cp2y = end.y;
            }

            this.wireElement.setAttribute('d', `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`);

            if (selectedNodeIdsSet && (selectedNodeIdsSet.has(this.sourceNodeInstanceId) || selectedNodeIdsSet.has(this.targetNodeInstanceId))) {
                 this.wireElement.classList.add('highlight');
            } else {
                 this.wireElement.classList.remove('highlight');
            }
        } else {
             this.removeDomElement();
        }
    }

    removeDomElement() {
        if (this.wireElement && this.wireElement.parentNode) {
            this.wireElement.parentNode.removeChild(this.wireElement);
        }
        this.wireElement = null;
    }
}