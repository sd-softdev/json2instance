import "reflect-metadata";
import { Type } from "typescript";

export interface IKeyDic {
  [k: string]: any;
}

export function JsonProperty(value: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("JsonProperty", value, target, propertyKey);
  };
}

export function JsonComponent<T>(type: { new (): T }, name: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(
      "JsonComponent",
      { name, type },
      target,
      propertyKey
    );
  };
}

export class JsonObject {
  [k: string]: any;
  getJsonPropertys(): IKeyDic {
    const refelectionKey = "JsonProperty";
    const retVal: { [k: string]: any } = {};
    for (const propObj of Object.getOwnPropertyNames(this)) {
      const reflectionObj = Reflect.getMetadata(
        refelectionKey,
        this,
        propObj
      ) as string;
      if (reflectionObj) {
        retVal[reflectionObj] = propObj;
      }
    }
    return retVal;
  }

  getJsonComponents(): IKeyDic {
    const refelectionKey = "JsonComponent";
    const retVal: IKeyDic = {};
    for (const propObj of Object.getOwnPropertyNames(this)) {
      const reflectionObj = Reflect.getMetadata(
        refelectionKey,
        this,
        propObj
      ) as { name: string; type: Type };
      if (reflectionObj) {
        retVal[reflectionObj.name] = {
          objPropName: propObj,
          type: reflectionObj.type,
        };
      }
    }
    return retVal;
  }

  static getObjectFromIcsJson<T extends JsonObject>(
    type: { new (): T },
    icalJson: IKeyDic[]
  ): T[] {
    const retVal: T[] = [];
    const _dummyObj = new type();
    const JsonPropertyComponentDict = _dummyObj.getJsonComponents();
    const JsonPropertyValueDict = _dummyObj.getJsonPropertys();
    for (const jsonObj of icalJson) {
      const newObject: JsonObject = new type();
      // set primitive properties
      for (const key in JsonPropertyValueDict) {
        if (Object.prototype.hasOwnProperty.call(JsonPropertyValueDict, key)) {
          const objPropName = JsonPropertyValueDict[key] as string;
          newObject[objPropName] = jsonObj[key] ?? undefined; // casting is a workaround for compiler
        }
      }
      // set objects/components properties
      for (const key in JsonPropertyComponentDict) {
        if (
          Object.prototype.hasOwnProperty.call(JsonPropertyComponentDict, key)
        ) {
          const reflectionPropObj = JsonPropertyComponentDict[key] as {
            objPropName: string;
            type: { new (): T };
          };
          if (key in jsonObj) {
            const componentObjects = JsonObject.getObjectFromIcsJson(
              reflectionPropObj.type,
              jsonObj[key]
            );
            newObject[reflectionPropObj.objPropName] = componentObjects;
          }
        }
      }
      retVal.push(newObject as any); // TODO::workaround
    }

    return retVal;
  }

}
