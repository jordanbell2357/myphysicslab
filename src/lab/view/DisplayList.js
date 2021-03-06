// Copyright 2016 Erik Neumann.  All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.module('myphysicslab.lab.view.DisplayList');

const array = goog.require('goog.array');

const AbstractSubject = goog.require('myphysicslab.lab.util.AbstractSubject');
const CoordMap = goog.require('myphysicslab.lab.view.CoordMap');
const DisplayObject = goog.require('myphysicslab.lab.view.DisplayObject');
const DisplayShape = goog.require('myphysicslab.lab.view.DisplayShape');
const DisplaySpring = goog.require('myphysicslab.lab.view.DisplaySpring');
const GenericEvent = goog.require('myphysicslab.lab.util.GenericEvent');
const SimObject = goog.require('myphysicslab.lab.model.SimObject');
const Util = goog.require('myphysicslab.lab.util.Util');

/** A set of {@link DisplayObject}s, which show the state of the simulation. A
DisplayObject typically represents a {@link SimObject}, but not always.

zIndex
------
DisplayObjects with a lower `zIndex` appear underneath those with higher `zIndex`.
The DisplayList is sorted by `zIndex`. See {@link DisplayObject#getZIndex}.

*/
class DisplayList extends AbstractSubject {
/**
* @param {string=} opt_name name of this DisplayList.
*/
constructor(opt_name) {
  super(opt_name || 'DISPLAY_LIST_'+(DisplayList.NAME_ID++));
  /**
  * @type {!Array<!DisplayObject>}
  * @private
  */
  this.drawables_ = [];
};

/** @override */
toString() {
  return Util.ADVANCED ? '' : this.toStringShort().slice(0, -1)
      +', drawables_: ['
      + this.drawables_.map((d, idx) => idx+': '+d.toStringShort())
      + ']' + super.toString();
};

/** @override */
toStringShort() {
  return Util.ADVANCED ? '' :
      super.toStringShort().slice(0, -1)
      +', drawables_.length: '+this.drawables_.length +'}';
};

/** @override */
getClassName() {
  return 'DisplayList';
};

/** Adds the DisplayObject, inserting it at the end of the group of DisplayObjects
with the same zIndex; the item will appear visually over objects that have
the same (or lower) `zIndex`.
@param {!DisplayObject} dispObj the DisplayObject to add
*/
add(dispObj) {
  if (!goog.isObject(dispObj)) {
    throw 'non-object passed to DisplayList.add';
  }
  const zIndex = dispObj.getZIndex();
  if (Util.DEBUG) {
    this.preExist(dispObj);
  }
  this.sort();
  // Objects in drawables_ array should be sorted by zIndex.
  // Starting at front of drawables_ array, find the object with bigger
  // zIndex, insert dispObj just before that object.
  let n = this.drawables_.length;
  let i;
  for (i=0; i<n; i++) {
    const z = this.drawables_[i].getZIndex();
    if (zIndex < z) {
      break;
    }
  }
  array.insertAt(this.drawables_, dispObj, i);
  this.broadcast(new GenericEvent(this, DisplayList.OBJECT_ADDED, dispObj));
};

/** Returns true if this DisplayList contains the given DisplayObject.
@param {!DisplayObject} dispObj the item to search for
@return {boolean} true if the DisplayObject was found
*/
contains(dispObj) {
  if (!goog.isObject(dispObj)) {
    throw 'non-object passed to DisplayList.contains';
  }
  return this.drawables_.includes(dispObj);
};

/** Draws the DisplayObjects in order, which means that DisplayObjects drawn later (at
the end of the list) will appear to be on top of those drawn earlier (at start of the
list).
@param {!CanvasRenderingContext2D} context the canvas's context to draw this object into
@param {!CoordMap} map the mapping to use for translating between simulation and screen
    coordinates
*/
draw(context, map) {
  this.sort();
  this.drawables_.forEach(dispObj => dispObj.draw(context, map));
};

/** Returns the DisplayObject that shows the given SimObject.
@param {!SimObject|string|number} search  the SimObject to search for, or name of
    SimObject, or index number of DisplayObject.
    Name should be English or language-independent version of name.
@return {?DisplayObject} the DisplayObject on this list that shows
    the given SimObject, or null if not found
*/
find(search) {
  if (typeof search === 'number') {
    const index = /** @type {number}*/(search);
    const n = this.drawables_.length;
    if (index < 0 || index >= n) {
      return null;
    } else {
      this.sort();
      return this.drawables_[index];
    }
  } else if (typeof search === 'string') {
    const objName = Util.toName(search);
    return array.find(this.drawables_, element => {
      const simObjs = element.getSimObjects();
      for (let i=0, n=simObjs.length; i<n; i++) {
        if (simObjs[i].getName() == objName) {
          return true;
        }
      }
      return false;
    });
  } else if (goog.isObject(search)) {
    return array.find(this.drawables_, element => {
      const simObjs = element.getSimObjects();
      return array.contains(simObjs, search);
    });
  } else {
    return null;
  }
};

/** Returns the DisplayShape that shows the given SimObject.
@param {!SimObject|string|number} search  the SimObject to search for, or name of
    SimObject, or index number of DisplayObject.
    Name should be English or language-independent version of name.
@return {!DisplayShape} the DisplayShape on this list that shows
    the given SimObject
@throws {!Error} if DisplayShape is not found
*/
findShape(search) {
  const ds = this.find(search);
  if (ds instanceof DisplayShape) {
    return /**!DisplayShape*/(ds);
  }
  throw 'DisplayShape not found: '+search;
};

/** Returns the DisplaySpring that shows the given SimObject.
@param {!SimObject|string|number} search  the SimObject to search for, or name of
    SimObject, or index number of DisplayObject.
    Name should be English or language-independent version of name.
@return {!DisplaySpring} the DisplaySpring on this list that shows
    the given SimObject
@throws {!Error} if DisplaySpring is not found
*/
findSpring(search) {
  const ds = this.find(search);
  if (ds instanceof DisplaySpring) {
    return /**!DisplaySpring*/(ds);
  }
  throw 'DisplaySpring not found: '+search;
};

/** Returns the DisplayObject at the specified position in this DisplayList
@param {number} index  index number of DisplayObject
@return {!DisplayObject} the DisplayObject at the specified
    position in this DisplayList
@throws {!Error} if index out of range
*/
get(index) {
  const n = this.drawables_.length;
  if (index < 0 || index >= n) {
    throw index+' is not in range 0 to '+(n-1);
  }
  this.sort();
  return this.drawables_[index];
};

/** Returns number of DisplayObjects in this DisplayList, minus 1.
@return number of DisplayObjects minus 1
*/
length() {
  return this.drawables_.length;
};

/**
@param {!DisplayObject} dispObj
@private
*/
preExist(dispObj) {
  if (Util.DEBUG) {
    const simObjs = dispObj.getSimObjects();
    for (let i=0, len=simObjs.length; i<len; i++) {
      const obj = simObjs[i];
      const preExist = this.find(obj);
      if (preExist != null) {
        console.log('*** WARNING PRE-EXISTING DISPLAYOBJECT '+preExist);
        console.log('*** FOR SIMOBJECT=' + obj);
        console.log('*** WHILE ADDING '+dispObj);
        throw 'pre-existing object '+preExist+' for '+obj+' adding '+dispObj;
      }
    }
  }
};

/** Adds the DisplayObject, inserting it at the front of the group of DisplayObjects
with the same zIndex; the item will appear visually under objects that have
the same (or higher) `zIndex`.
@param {!DisplayObject} dispObj the DisplayObject to prepend
*/
prepend(dispObj) {
  if (!goog.isObject(dispObj)) {
    throw 'non-object passed to DisplayList.add';
  }
  const zIndex = dispObj.getZIndex();
  if (Util.DEBUG) {
    this.preExist(dispObj);
  }
  this.sort();
  // Objects in drawables_ array should be sorted by zIndex.
  // Starting at back of drawables_ array, find the object with smaller
  // zIndex, insert dispObj just after that object.
  let n = this.drawables_.length;
  let i;
  for (let i=n; i>0; i--) {
    const z = this.drawables_[i-1].getZIndex();
    if (zIndex > z) {
      break;
    }
  }
  array.insertAt(this.drawables_, dispObj, i);
  this.broadcast(new GenericEvent(this, DisplayList.OBJECT_ADDED, dispObj));
};

/** Removes the item from the list of DisplayObjects.
@param {!DisplayObject} dispObj the item to remove
*/
remove(dispObj) {
  if (!goog.isObject(dispObj)) {
    throw 'non-object passed to DisplayList.remove';
  }
  const idx = this.drawables_.indexOf(dispObj);
  if (idx > -1) {
    array.removeAt(this.drawables_, idx);
    this.broadcast(new GenericEvent(this, DisplayList.OBJECT_REMOVED, dispObj));
  };
};

/** Clears the list of DisplayObjects.
* @return {undefined}
*/
removeAll() {
  array.forEachRight(this.drawables_, dispObj => this.remove(dispObj));
};

/** Sorts the DisplayList by zIndex. Avoids sorting if the list is already sorted.
* @return {undefined}
*/
sort() {
  // avoid sorting if the list is already sorted
  let isSorted = true;
  let lastZ = Util.NEGATIVE_INFINITY;
  for (let i=0, n= this.drawables_.length; i<n; i++) {
    const z = this.drawables_[i].getZIndex();
    if (z < lastZ) {
      isSorted = false;
      break;
    }
    lastZ = z;
  }
  if (!isSorted) {
    array.stableSort(this.drawables_, function(arg1, arg2) {
      const e1 = /** @type {!DisplayObject}*/(arg1);
      const e2 = /** @type {!DisplayObject}*/(arg2);
      const z1 = e1.getZIndex();
      const z2 = e2.getZIndex();
      if (z1 < z2) {
        return -1;
      } else if (z1 > z2) {
        return 1;
      } else {
        return 0;
      }
    });
  }
};

/**  Returns set of the DisplayObjects in proper visual sequence, starting with the
bottom-most object.
@return {!Array<!DisplayObject>} list of DisplayObjects in visual sequence order
*/
toArray() {
  this.sort();
  return Array.from(this.drawables_);
};

} // end class

/**
* @type {number}
*/
DisplayList.NAME_ID = 1;

/** Name of event broadcast when a DisplayObject is added, see {@link #add},
* {@link #prepend}.
* @type {string}
* @const
*/
DisplayList.OBJECT_ADDED = 'OBJECT_ADDED';

/** Name of event broadcast when a DisplayObject is removed, see {@link #remove},
* {@link #removeAll}.
* @type {string}
* @const
*/
DisplayList.OBJECT_REMOVED = 'OBJECT_REMOVED';

exports = DisplayList;
