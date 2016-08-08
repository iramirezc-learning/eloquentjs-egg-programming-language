/* globals console */
// jshint -W069
// EGG Programming Language 
// ========================================================================================================

function skipSpace(string) {
    string = string.replace(/(#.*)/g, ""); // Remove all comments.. My Solution Exercise 3
    // Busca cualquier caracter que no sea un WhiteSpace.
    var first = string.search(/\S/);
    if (first === -1) {
        return ""; // Si no lo encuentra, retorna ''
    }
    return string.slice(first); // Retorna el string partido desde el momento que encontró un caracter no WhiteSpace.
}

// Author's Solution for Exercise 3
//function _skipSpace(string) {
//    var skippable = string.match(/^(\s|#.*)*/);
//    return string.slice(skippable[0].length);
//}

function parseApply(expression, program) {
    program = skipSpace(program);
    // Si el programa no empieza con un '('
    if (program[0] !== '(') {
        return {
            expr: expression,
            rest: program
        };
    }
    // sí empieza con un '(' se salta los espacios en blanco y cortando después del '('
    program = skipSpace(program.slice(1));
    // Guarda la expressión como tipo Apply y el operador.
    expression = {
        type: 'apply',
        operator: expression,
        args: []
    };
    // Mientras el resto del programa sea diferente de ')'
    while (program[0] !== ')') {
        // Agrega todo como argumentos
        var arg = parseExpression(program);
        expression.args.push(arg.expr);
        program = skipSpace(arg.rest);
        // Si hay una coma
        if (program[0] === ',') {
            // Se salta la coma y continua.
            program = skipSpace(program.slice(1));
        } else if (program[0] !== ')') {
            // Si el carácter es diferente a ')'
            throw new SyntaxError("Expected ',' or ')'");
        }
    }
    return parseApply(expression, program.slice(1));

}

function parseExpression(program) {
    program = skipSpace(program); // Se salta los espacios en blanco del inicio.
    var match, expr;
    // Primera compara contra una palabra entre comillas "expression"
    if ((match = /^"([^"]*)"/.exec(program)) !== null) {
        // Guarda la expresión como valor.
        expr = {
            type: 'value',
            value: match[1]
        };
        // Si no, compara contra una cadena de dígitos... 123564654
    } else if ((match = /^\d+\b/.exec(program)) !== null) {
        // Guarda la expresión como un valor Numérico.
        expr = {
            type: 'value',
            value: Number(match[0])
        };
        // Compara contra una palabra: expression
    } else if ((match = /^[^\s(),"]+/.exec(program)) !== null) {
        // Guarda la expresión como una palabra.
        expr = {
            type: 'word',
            name: match[0]
        };
    } else {
        // Si no, envía un error de sintaxis.
        throw new SyntaxError("Unexpected syntax: " + program);
    }
    // Aplica el parseo.
    return parseApply(expr, program.slice(match[0].length)); // Envía la expresión encontrada y el resto de la cadena.
}


function parse(program) {
    var result = parseExpression(program);
    // si quedó algo sin procesar...
    if (skipSpace(result.rest).length > 0) {
        throw new SyntaxError("Unexpected text after program");
    }
    return result.expr;
}

function evaluate(expr, environment) {
    // solo hay 3 tipos de expresiones, value, word, apply.
    switch (expr.type) {
    case 'value': // si es un valor.
        return expr.value; // retorna lo que vale.
    case 'word': // si es una palabra (variable)
        if (expr.name in environment) { // Si el nombre de la palabra está en el 'environment'
            return environment[expr.name]; // retorna el objeto 'name' de 'environment'
        }
        throw new ReferenceError("Undefined variable: " + expr.name); // Envía un error de referencia si no existe el 'name' dentro de 'environment'.
    case 'apply': // en caso de que tenga que aplicarse
        // si la expresión es una palabra y esta dentro de los comandos especiales.
        if (expr.operator.type === 'word' && expr.operator.name in specialForms) {
            //Ejecuta el comando especial con el nombre 'name' y envía los argumentos y el 'environment'
            return specialForms[expr.operator.name](expr.args, environment);
        }
        var op = evaluate(expr.operator, environment); // Llamada recursiva, analiza el operador del apply.
        if (typeof op !== 'function') { // si el operador no es una función
            throw new TypeError('Applying a non-function'); //envía el error.
        }
        // Si es una función, la ejecuta.
        return op.apply(null, expr.args.map(function (arg) {
            return evaluate(arg, environment); // Envía todos los argumentos con sus valores.
        }));
    }
}

var specialForms = Object.create(null); // nuevo objeto sin propiedades ni prototipos.

// Variable 'if'
specialForms['if'] = function (args, environment) {
    // Debe tener 3 argumentos
    if (args.length !== 3) {
        throw new SyntaxError('Bad number of args to if');
    }
    // si el argumento 1 (condición) no es False
    if (evaluate(args[0], environment) !== false) {
        // retorna el valor 1
        return evaluate(args[1], environment);
    } else {
        // retorna el valor 2
        return evaluate(args[2], environment);
    }
};

// Variable 'while'
specialForms['while'] = function (args, environment) {
    // Debe tener 2 argumentos
    if (args.length !== 2) {
        throw new SyntaxError('Bad number of args to if');
    }
    while (evaluate(args[0], environment) !== false) {
        evaluate(args[1], environment);
    }
    // Egg no tendrá el valor undefined, así que hay que retornar false.
    return false;
};

// Comando 'do'
specialForms['do'] = function (args, environment) {
    var value = false;
    // Por cada argumento...
    args.forEach(function (arg) {
        // Ejecutar la función
        value = evaluate(arg, environment);
    });
    // Retornar el último valor obtenido.
    return value;
};

// Comando 'define' para definir variables.
specialForms['define'] = function (args, environment) {
    if (args.length !== 2 || args[0].type !== 'word') {
        throw new SyntaxError('Bad use of define.');
    }
    var value = evaluate(args[1], environment);
    environment[args[0].name] = value;
    return value;
};

/* THE ENVIRONMENT */

var topEnv = Object.create(null);

// Booleanos
topEnv["true"] = true;
topEnv["false"] = false;

// Operadores

// jshint -W054
['+', '-', '*', '/', '==', '<', '>'].forEach(function (op) {
    topEnv[op] = new Function('a, b', 'return a ' + op + ' b;');
});

// Print to console

topEnv['print'] = function (value) {
    console.log(value);
    return value;
};

/**** THE RUN FUNCTION *****/
/**
 * Crea un entorno nuevo y y parsea y evalua los strings como comandos.
 */
function run() {
    // Crea un nuevo environment.
    var env = Object.create(topEnv);
    // El programa es igual a , los argumentos dados cortados a partir del index 0 y juntados con un salto de línea.
    var program = Array.prototype.slice.call(arguments, 0).join('\n');
    //console.log(program);
    return evaluate(parse(program), env);
}

/***** FUNCTIONS *******/
specialForms['fun'] = function (args, environment) {
    //console.log('args->', args);
    // si no tiene argumentos, envía un error.
    if (!args.length) {
        throw new SyntaxError('Functions need a body');
    }

    // Retorna el nombre de una expresión.
    function name(expr) {
        if (expr.type !== 'word') { // Si la expresión no es una palabra, envía error.
            throw new SyntaxError('Arguments must be words');
        }
        return expr.name;
    }
    // Obtiene los nombres de los argumentos.
    var argNames = args.slice(0, args.length - 1).map(name);
    //console.log('argNames->', argNames);

    var body = args[args.length - 1]; // el último item
    //console.log('body->', body);

    return function () {
        //console.log('arguments->', arguments);
        if (arguments.length !== argNames.length) { // si no coinciden el número de argumentos.
            throw new TypeError('Wrong number of arguments.');
        }
        var localEnv = Object.create(environment);
        for (var i = 0; i < arguments.length; i++) {
            localEnv[argNames[i]] = arguments[i];
        }
        //console.log('localEnv->', localEnv);
        return evaluate(body, localEnv);
    };
};

// Excercises
// ========================================================================================================
// Excercise 1. Arrays.
topEnv["array"] = function () {
    return Array.prototype.slice.call(arguments, 0); // Same as Author's
};

topEnv["length"] = function (array) {
    return array.length; // Same as Author's
};

topEnv["element"] = function (array, i) {
    return array[i]; // Same as Author's
};

run("do(define(sum, fun(array,",
    "     do(define(i, 0),",
    "        define(sum, 0),",
    "        while(<(i, length(array)),",
    "          do(define(sum, +(sum, element(array, i))),",
    "             define(i, +(i, 1)))),",
    "        sum))),",
    "   print(sum(array(1, 2, 3))))"); // 6

// Excercise 2. Closure.
// Just explain how does this work.
run("do(define(f, fun(a, fun(b, +(a, b)))),",
    "   print(f(4)(5)))"); // 9

// Excercise 3. Comments -> Modify the skipSpace function
console.log(parse("# hello\nx")); // {type: "word", name: "x"}
console.log(parse("a # one\n   # two\n()")); // {type: "apply", operator: {type: "word", name: "a"}, args: []}

// Exercise 4. Fixing Scope.
specialForms['set'] = function (args, environment) {
    if (args.length !== 2 || args[0].type !== 'word') {
        throw new SyntaxError('Bad use of set.');
    }
    var value = evaluate(args[1], environment);
    do {
        if (Object.prototype.hasOwnProperty.call(environment, args[0].name)) {
            environment[args[0].name] = value;
            return value;
        } else {
            environment = Object.getPrototypeOf(environment);
        }
    } while (environment !== null);
    throw new ReferenceError(args[0].name + ' is not defined.');
};

// Author's solution for Exercise 4
specialForms["_set"] = function (args, env) {
    if (args.length !== 2 || args[0].type !== "word") {
        throw new SyntaxError("Bad use of set");
    }
    var varName = args[0].name;
    var value = evaluate(args[1], env);

    for (var scope = env; scope; scope = Object.getPrototypeOf(scope)) {
        if (Object.prototype.hasOwnProperty.call(scope, varName)) {
            scope[varName] = value;
            return value;
        }
    }
    throw new ReferenceError("Setting undefined variable " + varName);
};

run("do(define(x, 4),",
    "   define(setx, fun(val, set(x, val))),",
    "   setx(50),",
    "   print(x))"); //50

console.log("It should return a ReferenceError");
run("set(quux, true)"); // Some kind of ReferenceError