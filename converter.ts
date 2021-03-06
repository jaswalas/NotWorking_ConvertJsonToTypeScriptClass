// import data  from './data';

// // function print() {
// //     console.clear();
// //     const res = Object.entries(data);
// //     console.log(res);
// //     console.log(typeof res[2][1]);
// //    // console.log(typeof res[3][1], Array.isArray(res[3][1]));
// // }

// // print();

// // function jsonToTS() {


// // } 


// // class Foo {
// //    public name: string = '';
// //     constructor(jsonStr: string) {
// //         let jsonObj : any = JSON.parse(jsonStr);
// //         for(let prop in jsonObj) {
// //             this[prop] = jsonObj[prop];
// //         }
// //     }
// // }


// class Foo {
//     name: string = ''; 

//     constructor(jsonStr: string) {
//         let jsonObj: any = JSON.parse(jsonStr);
//         for (let prop in jsonObj) {
//             this[prop] = jsonObj[prop];
//         }
//     }
// }

// let fObj: Foo = new Foo(JSON.stringify(data));
// console.log(fObj);


import { debug } from "console";
import * as ts from "typescript";

let fileName = process.argv[2];

function printInferredTypes(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let checker = program.getTypeChecker();

    let knownTypes: {[name: string]: boolean} = {};
    let pendingTypes: {name: string, symbol: ts.Symbol}[] = [];

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.fileName == fileName) {
            ts.forEachChild(sourceFile, visit);
        }
    }

    while (pendingTypes.length > 0) {
        let pendingType = pendingTypes.shift();
        printJsonType(pendingType.name, pendingType.symbol);
    }


    function visit(node: ts.Node) {
        if (node.kind == ts.SyntaxKind.VariableStatement) {
            (<ts.VariableStatement>node).declarationList.declarations.forEach(declaration => {
                if (declaration.name.kind == ts.SyntaxKind.Identifier) {
                    let identifier = <ts.Identifier>declaration.name;
                    let symbol = checker.getSymbolAtLocation(identifier);
                    if (symbol) {
                        let t = checker.getTypeOfSymbolAtLocation(symbol, identifier);
                        if (t && t.symbol) {
                            pendingTypes.push({name: identifier.text, symbol: t.symbol});
                        }
                    }
                }
            });
        }
    }

    function printJsonType(name: string, symbol: ts.Symbol) {
        if (symbol.members) {
            console.log(`export interface ${capitalize(name)} {`);
            Object.keys(symbol.members).forEach(k => {
                let member = symbol.members[k];
                let typeName = null;
                if (member.declarations[0]) {
                    let memberType = checker.getTypeOfSymbolAtLocation(member, member.declarations[0]);
                    if (memberType) {
                        typeName = getMemberTypeName(k, memberType);
                    }
                }
                if (!typeName) {
                    console.log(`// Sorry, could not get type name for ${k}!`);
                } else {
                    console.log(`    ${k}: ${typeName};`);
                }
            });
            console.log(`}`);
        }
    }

    function getMemberTypeName(memberName: string, memberType: ts.Type): string | null {
       debugger;
        if (memberType.flags == ts.TypeFlags.String) {
            return 'string';
        } else if (memberType.flags == ts.TypeFlags.Number) {
            return 'number';
        } else if (0 !== (memberType.flags & ts.TypeFlags.Boolean)) {
            return 'boolean';
        } else if (memberType.symbol) {
            if (memberType.symbol.name == 'Array' && (<ts.TypeReference>memberType).typeArguments) {
                let elementType = (<ts.TypeReference>memberType).typeArguments[0];
                if (elementType && elementType.symbol) {
                    let elementTypeName = capitalize(stripS(memberName));
                    if (!knownTypes[elementTypeName]) {
                        knownTypes[elementTypeName] = true;
                        pendingTypes.push({name: elementTypeName, symbol: elementType.symbol});
                    }
                    return `${elementTypeName}[]`;
                }
            } else if (memberType.symbol.name == '__object') {
                let typeName = capitalize(memberName);
                if (!knownTypes[typeName]) {
                    knownTypes[typeName] = true;
                    pendingTypes.push({name: typeName, symbol: memberType.symbol});
                }
                return typeName;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    function capitalize(n: string) {
        return n.charAt(0).toUpperCase() + n.slice(1);
    }
    function stripS(n: string) {
        return n.endsWith('s') ? n.substring(0, n.length - 1) : n;
    }
}

printInferredTypes([fileName], {
    noEmitOnError: true, noImplicitAny: true,
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
});



