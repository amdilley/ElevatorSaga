/*********************************
 * Elevator Saga                 *
 * http://play.elevatorsaga.com/ *
 *********************************/

{
    init: function (elevators, floors) {
        this.elevators = elevators;
        this.floors = floors;
        this.upFloors = [];
        this.downFloors = [];

        this.initElevators(elevators);
        this.initFloors(floors);
    },

    initElevators: function (elevators) {
        for (var i = 0, l = this.elevators.length; i < l; i++) {
            var elevator = this.elevators[i];

            elevator.direction = 'up';

            elevator.on('idle', this._handleIdleElevator.bind(this, elevator));
            elevator.on('floor_button_pressed', this._updateDestinationQueue.bind(elevator));
            elevator.on('passing_floor', this._checkFloorQueues.bind(this, elevator));
            // elevator.on('stopped_at_floor', this._handleStoppedElevator.bind(elevator));
        }
    },

    initFloors: function (floors) {
        for (var i = 0, l = this.floors.length; i < l; i++) {
            var floor = this.floors[i]
            var floorNum = floor.floorNum();

            floor.on('up_button_pressed', this._handleFloorButtonPush.bind(this, floorNum, 'up'));
            floor.on('down_button_pressed', this._handleFloorButtonPush.bind(this, floorNum, 'down'));
        }
    },

    update: function (dt, elevators, floors) {

    },

    /**
     * @param {number} floorNum number of floor where button is pushed
     * @param {string} direction direction of button pushed ('up' or 'down')
     */
    _addToFloorQueue: function (floorNum, direction) {
        var floorQueue = direction === 'up' ? this.upFloors : this.downFloors;
        var floorIndex = floorQueue.indexOf(floorNum);

        if (floorIndex === -1) {
            floorQueue.push(floorNum);
        }
    },

    /**
     * @param {object} elevator
     * @param {number} floorNum number of floor being passed by elevator
     */
    _checkFloorQueues: function (elevator, floorNum) {
        var floorQueue = this.direction === 'up' ? this.upFloors : this.downFloors;
        var floorIndex = floorQueue.indexOf(floorNum);

        // TODO: add check for passenger capacity
        if (floorIndex !== -1) {
            this._updateDestinationQueue.call(elevator, floorNum);
            floorQueue.splice(floorIndex, 1);
        }
    },

    /**
     * @param {number} referenceFloor floor to find the closest current floor requesting elevator
     */
    _getClosestFloor: function (referenceFloor) {
        var floorUnion = this.downFloors.slice(0);

        for (var i = 0; i < this.upFloors.length; i++) {
            if (floorUnion.indexOf(this.upFloors[i]) === -1) {
                floorUnion.push(this.upFloors[i]);
            }
        }

        if (floorUnion.length === 0) {
            return 0;
        }

        return floorUnion.reduce(function (prev, curr) {
            var prevFloorDistance = Math.abs(referenceFloor - prev);
            var currFloorDistance = Math.abs(referenceFloor - curr);

            return prevFloorDistance < currFloorDistance ? prev : curr;
        });
    },

    /**
     * @param {number} floorNum number of floor requesting pickup
     * @param {string} direction of button pushed ('up' or 'down')
     */
    _handleFloorButtonPush: function (floorNum, direction) {
        var numFloors = this.floors.length;

        this._addToFloorQueue(floorNum, direction);
        
        this.elevators.reduce(function (prev, curr) {
            var prevElevatorDistance = currElevatorDistance = numFloors;

            if (prev.destinationQueue.length === 0) {
                prevElevatorDistance = Math.abs(floorNum - prev.currentFloor());
            }

            if (curr.destinationQueue.length === 0) {
                currElevatorDistance = Math.abs(floorNum - curr.currentFloor());
            }

            return prevElevatorDistance < currElevatorDistance ? prev : curr;
        }).trigger('idle');
    },

    /**
     * @param {object} elevator
     */
    _handleIdleElevator: function (elevator) {
        var currentFloor = elevator.currentFloor();
        var closestFloor = this._getClosestFloor(currentFloor);

        this._updateDestinationQueue.call(elevator, closestFloor);
    },

    /**
     * @param {number} floorNum number of floor to be added to elevator destination queue
     */
    _updateDestinationQueue: function (floorNum) {
        var currentFloor = this.currentFloor();
        var destinationQueue = this.destinationQueue;
        var aboveFloors, belowFloors;

        this.direction = currentFloor < destinationQueue[0] ? 'up' : 'down';

        // disregard previously pressed floors
        if (destinationQueue.indexOf(floorNum) === -1) {
            destinationQueue.push(floorNum);
        }

        // only sort queue if efficient to do so, i.e. floorNum is on the way to other target floors
        if (this.direction === 'up') {
            aboveFloors = destinationQueue.filter(function (floor) {
                return floor > currentFloor;
            }).sort();   
            belowFloors = destinationQueue.filter(function (floor) {
                return floor <= currentFloor;
            }).sort().reverse();

            destinationQueue = aboveFloors.concat(belowFloors);
        } else {
            aboveFloors = destinationQueue.filter(function (floor) {
                return floor >= currentFloor;
            }).sort();   
            belowFloors = destinationQueue.filter(function (floor) {
                return floor < currentFloor;
            }).sort().reverse();

            destinationQueue = belowFloors.concat(aboveFloors);
        }

        this.checkDestinationQueue(); // apply new queue
    }
}