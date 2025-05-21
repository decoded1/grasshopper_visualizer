export class AnchorPoint {
    constructor(parentNodeInstanceId, anchorDefinition, type, indexOnNode) {
        this.nodeInstanceId = parentNodeInstanceId;
        this.definitionAddress = anchorDefinition.address;
        this.name = anchorDefinition.name;
        this.nickName = anchorDefinition.nickName;
        this.typeName = anchorDefinition.typeName;
        this.type = type;
        this.indexOnNode = indexOnNode;
        this.elementId = `anchor-${this.nodeInstanceId}-${this.definitionAddress.replace(/\./g, '_')}`;
        this.connections = [];
        this.relX = 0;
        this.relY = 0;
        this.width = 14;
        this.height = 14;
    }

    getGlobalInstanceAddress() {
        return `${this.nodeInstanceId}.${this.definitionAddress}`;
    }

    addConnection(connectionId) {
        if (!this.connections.includes(connectionId)) {
            this.connections.push(connectionId);
        }
    }

    removeConnection(connectionId) {
        this.connections = this.connections.filter(id => id !== connectionId);
    }

    hasConnections() {
        return this.connections.length > 0;
    }

    canConnectTo(targetAnchor) {
        if (!targetAnchor) return false;
        if (this.type === 'output' && targetAnchor.type === 'input') {
            if (targetAnchor.connections.length > 0) {
                console.warn(`Target input anchor ${targetAnchor.nickName} is already connected.`);
                return false;
            }
            if (this.typeName === "Generic Data" || targetAnchor.typeName === "Generic Data") {
                return true;
            }
            return this.typeName === targetAnchor.typeName;
        }
        return false;
    }
}