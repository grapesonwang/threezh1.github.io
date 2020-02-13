(function () {
    
    var codeGenerator = (typeof eval(&quot;(function () {})&quot;) == &quot;function&quot;) ?
        function (code) { return code; } :
        function (code) { return &quot;false || &quot; + code; };
        
    // support string type only.
    var stringify = (typeof JSON !== &quot;undefined&quot; &amp;&amp; JSON.stringify) ?
        function (s) { return JSON.stringify(s); } :
        (function () {
            // Implementation comes from JSON2 (http://www.json.org/js.html)
        
            var escapable = /[\\\&quot;\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
            
            var meta = {    // table of character substitutions
                &apos;\b&apos;: &apos;\\b&apos;,
                &apos;\t&apos;: &apos;\\t&apos;,
                &apos;\n&apos;: &apos;\\n&apos;,
                &apos;\f&apos;: &apos;\\f&apos;,
                &apos;\r&apos;: &apos;\\r&apos;,
                &apos;&quot;&apos; : &apos;\\&quot;&apos;,
                &apos;\\&apos;: &apos;\\\\&apos;
            }
            
            return function (s) {
                // If the string contains no control characters, no quote characters, and no
                // backslash characters, then we can safely slap some quotes around it.
                // Otherwise we must also replace the offending characters with safe escape
                // sequences.

                escapable.lastIndex = 0;
                return escapable.test(s) ? &apos;&quot;&apos; + s.replace(escapable, function (a) {
                    var c = meta[a];
                    return typeof c === &apos;s&apos; ? c :
                        &apos;\\u&apos; + (&apos;0000&apos; + a.charCodeAt(0).toString(16)).slice(-4);
                }) + &apos;&quot;&apos; : &apos;&quot;&apos; + s + &apos;&quot;&apos;;
            };
        })();
    
    // seed defined in global
    if (typeof __jscex__tempVarSeed === &quot;undefined&quot;) {
        __jscex__tempVarSeed = 0;
    }

    var init = function (root) {
    
        if (root.modules[&quot;jit&quot;]) {
            return;
        }
    
        function JscexTreeGenerator(binder) {
            this._binder = binder;
            this._root = null;
        }
        JscexTreeGenerator.prototype = {

            generate: function (ast) {

                var params = ast[2], statements = ast[3];

                this._root = { type: &quot;delay&quot;, stmts: [] };

                this._visitStatements(statements, this._root.stmts);

                return this._root;
            },

            _getBindInfo: function (stmt) {

                var type = stmt[0];
                if (type == &quot;stat&quot;) {
                    var expr = stmt[1];
                    if (expr[0] == &quot;call&quot;) {
                        var callee = expr[1];
                        if (callee[0] == &quot;name&quot; &amp;&amp; callee[1] == this._binder &amp;&amp; expr[2].length == 1) {
                            return {
                                expression: expr[2][0],
                                argName: &quot;&quot;,
                                assignee: null
                            };
                        }
                    } else if (expr[0] == &quot;assign&quot;) {
                        var assignee = expr[2];
                        expr = expr[3];
                        if (expr[0] == &quot;call&quot;) {
                            var callee = expr[1];
                            if (callee[0] == &quot;name&quot; &amp;&amp; callee[1] == this._binder &amp;&amp; expr[2].length == 1) {
                                return {
                                    expression: expr[2][0],
                                    argName: &quot;$$_result_$$&quot;,
                                    assignee: assignee
                                };
                            }
                        }
                    }
                } else if (type == &quot;var&quot;) {
                    var defs = stmt[1];
                    if (defs.length == 1) {
                        var item = defs[0];
                        var name = item[0];
                        var expr = item[1];
                        if (expr &amp;&amp; expr[0] == &quot;call&quot;) {
                            var callee = expr[1];
                            if (callee[0] == &quot;name&quot; &amp;&amp; callee[1] == this._binder &amp;&amp; expr[2].length == 1) {
                                return {
                                    expression: expr[2][0],
                                    argName: name,
                                    assignee: null
                                };                            
                            }
                        }
                    }
                } else if (type == &quot;return&quot;) {
                    var expr = stmt[1];
                    if (expr &amp;&amp; expr[0] == &quot;call&quot;) {
                        var callee = expr[1];
                        if (callee[0] == &quot;name&quot; &amp;&amp; callee[1] == this._binder &amp;&amp; expr[2].length == 1) {
                            return {
                                expression: expr[2][0],
                                argName: &quot;$$_result_$$&quot;,
                                assignee: &quot;return&quot;
                            };
                        }
                    }
                }

                return null;
            },

            _visitStatements: function (statements, stmts, index) {
                if (arguments.length <= 2) index="0;" if (index>= statements.length) {
                    stmts.push({ type: &quot;normal&quot; });
                    return this;
                }

                var currStmt = statements[index];
                var bindInfo = this._getBindInfo(currStmt);

                if (bindInfo) {
                    var bindStmt = { type: &quot;bind&quot;, info: bindInfo };
                    stmts.push(bindStmt);

                    if (bindInfo.assignee != &quot;return&quot;) {
                        bindStmt.stmts = [];
                        this._visitStatements(statements, bindStmt.stmts, index + 1);
                    }

                } else {
                    var type = currStmt[0];
                    if (type == &quot;return&quot; || type == &quot;break&quot; || type == &quot;continue&quot; || type == &quot;throw&quot;) {

                        stmts.push({ type: type, stmt: currStmt });

                    } else if (type == &quot;if&quot; || type == &quot;try&quot; || type == &quot;for&quot; || type == &quot;do&quot;
                               || type == &quot;while&quot; || type == &quot;switch&quot; || type == &quot;for-in&quot;) {

                        var newStmt = this._visit(currStmt);

                        if (newStmt.type == &quot;raw&quot;) {
                            stmts.push(newStmt);
                            this._visitStatements(statements, stmts, index + 1);
                        } else {
                            var isLast = (index == statements.length - 1);
                            if (isLast) {
                                stmts.push(newStmt);
                            } else {

                                var combineStmt = {
                                    type: &quot;combine&quot;,
                                    first: { type: &quot;delay&quot;, stmts: [newStmt] },
                                    second: { type: &quot;delay&quot;, stmts: [] }
                                };
                                stmts.push(combineStmt);

                                this._visitStatements(statements, combineStmt.second.stmts, index + 1);
                            }
                        }

                    } else {

                        stmts.push({ type: &quot;raw&quot;, stmt: currStmt });

                        this._visitStatements(statements, stmts, index + 1);
                    }
                }

                return this;
            },

            _visit: function (ast) {

                var type = ast[0];

                function throwUnsupportedError() {
                    throw new Error(&apos;&quot;&apos; + type + &apos;&quot; is not currently supported.&apos;);
                }

                var visitor = this._visitors[type];

                if (visitor) {
                    return visitor.call(this, ast);
                } else {
                    throwUnsupportedError();
                }
            },

            _visitBody: function (ast, stmts) {
                if (ast[0] == &quot;block&quot;) {
                    this._visitStatements(ast[1], stmts);
                } else {
                    this._visitStatements([ast], stmts);
                }
            },

            _noBinding: function (stmts) {
                switch (stmts[stmts.length - 1].type) {
                    case &quot;normal&quot;:
                    case &quot;return&quot;:
                    case &quot;break&quot;:
                    case &quot;throw&quot;:
                    case &quot;continue&quot;:
                        return true;
                }

                return false;
            },

            _collectCaseStatements: function (cases, index) {
                var res = [];

                for (var i = index; i &lt; cases.length; i++) {
                    var rawStmts = cases[i][1];
                    for (var j = 0; j &lt; rawStmts.length; j++) {
                        if (rawStmts[j][0] == &quot;break&quot;) {
                            return res
                        }

                        res.push(rawStmts[j]);
                    }
                }

                return res;
            },

            _visitors: {

                &quot;for&quot;: function (ast) {

                    var bodyStmts = [];
                    var body = ast[4];
                    this._visitBody(body, bodyStmts);

                    if (this._noBinding(bodyStmts)) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    }

                    var delayStmt = { type: &quot;delay&quot;, stmts: [] };
            
                    var setup = ast[1];
                    if (setup) {
                        delayStmt.stmts.push({ type: &quot;raw&quot;, stmt: setup });
                    }

                    var loopStmt = { type: &quot;loop&quot;, bodyFirst: false, bodyStmt: { type: &quot;delay&quot;, stmts: bodyStmts } };
                    delayStmt.stmts.push(loopStmt);
                    
                    var condition = ast[2];
                    if (condition) {
                        loopStmt.condition = condition;
                    }
                    
                    var update = ast[3];
                    if (update) {
                        loopStmt.update = update;
                    }

                    return delayStmt;
                },

                &quot;for-in&quot;: function (ast) {

                    var body = ast[4];
                    
                    var bodyStmts = [];
                    this._visitBody(body, bodyStmts);

                    if (this._noBinding(bodyStmts)) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    }
                
                    var id = (__jscex__tempVarSeed++);
                    var keysVar = &quot;$$_keys_$$_&quot; + id;
                    var indexVar = &quot;$$_index_$$_&quot; + id;
                    // var memVar = &quot;$$_mem_$$_&quot; + id;

                    var delayStmt = { type: &quot;delay&quot;, stmts: [] };

                    // var members = Jscex._forInKeys(obj);
                    var keysAst = root.parse(&quot;var &quot; + keysVar + &quot; = Jscex._forInKeys(obj);&quot;)[1][0];
                    keysAst[1][0][1][2][0] = ast[3]; // replace obj with real AST;
                    delayStmt.stmts.push({ type: &quot;raw&quot;, stmt: keysAst });

                    /*
                    // var members = [];
                    delayStmt.stmts.push({
                        type: &quot;raw&quot;,
                        stmt: uglifyJS.parse(&quot;var &quot; + membersVar + &quot; = [];&quot;)[1][0]
                    });
                    
                    // for (var mem in obj) members.push(mem);
                    var keysAst = uglifyJS.parse(&quot;for (var &quot; + memVar +&quot; in obj) &quot; + membersVar + &quot;.push(&quot; + memVar + &quot;);&quot;)[1][0];
                    keysAst[3] = ast[3]; // replace the &quot;obj&quot; with real AST.
                    delayStmt.stmts.push({ type : &quot;raw&quot;, stmt: keysAst});
                    */
                    
                    // var index = 0;
                    delayStmt.stmts.push({
                        type: &quot;raw&quot;,
                        stmt: root.parse(&quot;var &quot; + indexVar + &quot; = 0;&quot;)[1][0]
                    });

                    // index &lt; members.length
                    var condition = root.parse(indexVar + &quot; &lt; &quot; + keysVar + &quot;.length&quot;)[1][0][1];

                    // index++
                    var update = root.parse(indexVar + &quot;++&quot;)[1][0][1];

                    var loopStmt = {
                        type: &quot;loop&quot;,
                        bodyFirst: false,
                        update: update,
                        condition: condition,
                        bodyStmt: { type: &quot;delay&quot;, stmts: [] }
                    };
                    delayStmt.stmts.push(loopStmt);

                    var varName = ast[2][1]; // ast[2] == [&quot;name&quot;, m]
                    if (ast[1][0] == &quot;var&quot;) {
                        loopStmt.bodyStmt.stmts.push({
                            type: &quot;raw&quot;,
                            stmt: root.parse(&quot;var &quot; + varName + &quot; = &quot; + keysVar + &quot;[&quot; + indexVar + &quot;];&quot;)[1][0]
                        });
                    } else {
                        loopStmt.bodyStmt.stmts.push({
                            type: &quot;raw&quot;,
                            stmt: root.parse(varName + &quot; = &quot; + keysVar + &quot;[&quot; + indexVar + &quot;];&quot;)[1][0]
                        });
                    }

                    this._visitBody(body, loopStmt.bodyStmt.stmts);

                    return delayStmt;
                },

                &quot;while&quot;: function (ast) {

                    var bodyStmts = [];
                    var body = ast[2];
                    this._visitBody(body, bodyStmts);

                    if (this._noBinding(bodyStmts)) {
                        return { type: &quot;raw&quot;, stmt: ast }
                    }

                    var loopStmt = { type: &quot;loop&quot;, bodyFirst: false, bodyStmt: { type: &quot;delay&quot;, stmts: bodyStmts } };

                    var condition = ast[1];
                    loopStmt.condition = condition;

                    return loopStmt;
                },

                &quot;do&quot;: function (ast) {

                    var bodyStmts = [];
                    var body = ast[2];
                    this._visitBody(body, bodyStmts);

                    if (this._noBinding(bodyStmts)) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    }

                    var loopStmt = { type: &quot;loop&quot;, bodyFirst: true, bodyStmt: { type: &quot;delay&quot;, stmts: bodyStmts } };

                    var condition = ast[1];
                    loopStmt.condition = condition;

                    return loopStmt;
                },

                &quot;switch&quot;: function (ast) {
                    var noBinding = true;

                    var switchStmt = { type: &quot;switch&quot;, item: ast[1], caseStmts: [] };

                    var cases = ast[2];
                    for (var i = 0; i &lt; cases.length; i++) {                    
                        var caseStmt = { item: cases[i][0], stmts: [] };
                        switchStmt.caseStmts.push(caseStmt);

                        var statements = this._collectCaseStatements(cases, i);
                        this._visitStatements(statements, caseStmt.stmts);
                        noBinding = noBinding &amp;&amp; this._noBinding(caseStmt.stmts);
                    }

                    if (noBinding) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    } else {
                        return switchStmt;
                    }
                },

                &quot;if&quot;: function (ast) {

                    var noBinding = true;

                    var ifStmt = { type: &quot;if&quot;, conditionStmts: [] };

                    var currAst = ast;
                    while (true) {
                        var condition = currAst[1];
                        var condStmt = { cond: condition, stmts: [] };
                        ifStmt.conditionStmts.push(condStmt);

                        var thenPart = currAst[2];
                        this._visitBody(thenPart, condStmt.stmts);

                        noBinding = noBinding &amp;&amp; this._noBinding(condStmt.stmts);

                        var elsePart = currAst[3];
                        if (elsePart &amp;&amp; elsePart[0] == &quot;if&quot;) {
                            currAst = elsePart;
                        } else {
                            break;
                        }
                    }
        
                    var elsePart = currAst[3];
                    if (elsePart) {
                        ifStmt.elseStmts = [];

                        this._visitBody(elsePart, ifStmt.elseStmts);
                        
                        noBinding = noBinding &amp;&amp; this._noBinding(ifStmt.elseStmts);
                    }

                    if (noBinding) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    } else {
                        return ifStmt;
                    }
                },

                &quot;try&quot;: function (ast, stmts) {

                    var bodyStmts = [];
                    var bodyStatements = ast[1];
                    this._visitStatements(bodyStatements, bodyStmts);

                    var noBinding = this._noBinding(bodyStmts)

                    var tryStmt = { type: &quot;try&quot;, bodyStmt: { type: &quot;delay&quot;, stmts: bodyStmts } };
                    
                    var catchClause = ast[2];
                    if (catchClause) {
                        var exVar = catchClause[0];
                        tryStmt.exVar = exVar;
                        tryStmt.catchStmts = [];

                        this._visitStatements(catchClause[1], tryStmt.catchStmts);

                        noBinding = noBinding &amp;&amp; this._noBinding(tryStmt.catchStmts);
                    }

                    var finallyStatements = ast[3];
                    if (finallyStatements) {
                        tryStmt.finallyStmt = { type: &quot;delay&quot;, stmts: [] };

                        this._visitStatements(finallyStatements, tryStmt.finallyStmt.stmts);

                        noBinding = noBinding &amp;&amp; this._noBinding(tryStmt.finallyStmt.stmts);
                    }

                    if (noBinding) {
                        return { type: &quot;raw&quot;, stmt: ast };
                    } else {
                        return tryStmt;
                    }
                }
            }
        }

        function CodeGenerator(builderName, binder, indent) {
            this._builderName = builderName;
            this._binder = binder;
            this._normalMode = false;
            this._indent = indent;
            this._indentLevel = 0;
            this._builderVar = &quot;$$_builder_$$_&quot; + (__jscex__tempVarSeed++);
        }
        CodeGenerator.prototype = {
            _write: function (s) {
                this._buffer.push(s);
                return this;
            },

            _writeLine: function (s) {
                this._write(s)._write(&quot;\n&quot;);
                return this;
            },

            _writeIndents: function () {
                for (var i = 0; i &lt; this._indent; i++) {
                    this._write(&quot; &quot;);
                }

                for (var i = 0; i &lt; this._indentLevel; i++) {
                    this._write(&quot;    &quot;);
                }
                return this;
            },

            generate: function (params, jscexAst) {
                this._buffer = [];

                this._writeLine(&quot;(function (&quot; + params.join(&quot;, &quot;) + &quot;) {&quot;);
                this._indentLevel++;

                this._writeIndents()
                    ._writeLine(&quot;var &quot; + this._builderVar + &quot; = Jscex.builders[&quot; + stringify(this._builderName) + &quot;];&quot;);

                this._writeIndents()
                    ._writeLine(&quot;return &quot; + this._builderVar + &quot;.Start(this,&quot;);
                this._indentLevel++;

                this._pos = { };

                this._writeIndents()
                    ._visitJscex(jscexAst)
                    ._writeLine();
                this._indentLevel--;

                this._writeIndents()
                    ._writeLine(&quot;);&quot;);
                this._indentLevel--;

                this._writeIndents()
                    ._write(&quot;})&quot;);

                return this._buffer.join(&quot;&quot;);
            },

            _visitJscex: function (ast) {
                this._jscexVisitors[ast.type].call(this, ast);
                return this;
            },

            _visitRaw: function (ast) {
                var type = ast[0];

                function throwUnsupportedError() {
                    throw new Error(&apos;&quot;&apos; + type + &apos;&quot; is not currently supported.&apos;);
                }

                var visitor = this._rawVisitors[type];

                if (visitor) {
                    visitor.call(this, ast);
                } else {
                    throwUnsupportedError();
                }

                return this;
            },

            _visitJscexStatements: function (statements) {
                for (var i = 0; i &lt; statements.length; i++) {
                    var stmt = statements[i];

                    if (stmt.type == &quot;raw&quot; || stmt.type == &quot;if&quot; || stmt.type == &quot;switch&quot;) {
                        this._writeIndents()
                            ._visitJscex(stmt)._writeLine();
                    } else if (stmt.type == &quot;delay&quot;) {
                        this._visitJscexStatements(stmt.stmts);
                    } else {
                        this._writeIndents()
                            ._write(&quot;return &quot;)._visitJscex(stmt)._writeLine(&quot;;&quot;);
                    }
                }
            },

            _visitRawStatements: function (statements) {
                for (var i = 0; i &lt; statements.length; i++) {
                    var s = statements[i];

                    this._writeIndents()
                        ._visitRaw(s)._writeLine();

                    switch (s[0]) {
                        case &quot;break&quot;:
                        case &quot;return&quot;:
                        case &quot;continue&quot;:
                        case &quot;throw&quot;:
                            return;
                    }
                }
            },

            _visitRawBody: function (body) {
                if (body[0] == &quot;block&quot;) {
                    this._visitRaw(body);
                } else {
                    this._writeLine();
                    this._indentLevel++;

                    this._writeIndents()
                        ._visitRaw(body);
                    this._indentLevel--;
                }

                return this;
            },

            _visitRawFunction: function (ast) {
                var funcName = ast[1] || &quot;&quot;;
                var args = ast[2];
                var statements = ast[3];
                
                this._writeLine(&quot;function &quot; + funcName + &quot;(&quot; + args.join(&quot;, &quot;) + &quot;) {&quot;)
                this._indentLevel++;

                var currInFunction = this._pos.inFunction;
                this._pos.inFunction = true;

                this._visitRawStatements(statements);
                this._indentLevel--;

                this._pos.inFunction = currInFunction;

                this._writeIndents()
                    ._write(&quot;}&quot;);
            },

            _jscexVisitors: {
                &quot;delay&quot;: function (ast) {
                    if (ast.stmts.length == 1) {
                        var subStmt = ast.stmts[0];
                        switch (subStmt.type) {
                            case &quot;delay&quot;:
                            case &quot;combine&quot;:
                            case &quot;normal&quot;:
                            case &quot;break&quot;:
                            case &quot;continue&quot;:
                            case &quot;loop&quot;:
                            case &quot;try&quot;:
                                this._visitJscex(subStmt);
                                return;
                            case &quot;return&quot;:
                                if (!subStmt.stmt[1]) {
                                    this._visitJscex(subStmt);
                                    return;
                                }
                        }
                    }

                    this._writeLine(this._builderVar + &quot;.Delay(function () {&quot;);
                    this._indentLevel++;

                    this._visitJscexStatements(ast.stmts);
                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;})&quot;);
                },

                &quot;combine&quot;: function (ast) {
                    this._writeLine(this._builderVar + &quot;.Combine(&quot;);
                    this._indentLevel++;

                    this._writeIndents()
                        ._visitJscex(ast.first)._writeLine(&quot;,&quot;);
                    this._writeIndents()
                        ._visitJscex(ast.second)._writeLine();
                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;)&quot;);
                },

                &quot;loop&quot;: function (ast) {
                    this._writeLine(this._builderVar + &quot;.Loop(&quot;);
                    this._indentLevel++;

                    if (ast.condition) {
                        this._writeIndents()
                            ._writeLine(&quot;function () {&quot;);
                        this._indentLevel++;

                        this._writeIndents()
                            ._write(&quot;return &quot;)._visitRaw(ast.condition)._writeLine(&quot;;&quot;);
                        this._indentLevel--;

                        this._writeIndents()
                            ._writeLine(&quot;},&quot;);
                    } else {
                        this._writeIndents()._writeLine(&quot;null,&quot;);
                    }

                    if (ast.update) {
                        this._writeIndents()
                            ._writeLine(&quot;function () {&quot;);
                        this._indentLevel++;

                        this._writeIndents()
                            ._visitRaw(ast.update)._writeLine(&quot;;&quot;);
                        this._indentLevel--;

                        this._writeIndents()
                            ._writeLine(&quot;},&quot;);
                    } else {
                        this._writeIndents()._writeLine(&quot;null,&quot;);
                    }

                    this._writeIndents()
                        ._visitJscex(ast.bodyStmt)._writeLine(&quot;,&quot;);

                    this._writeIndents()
                        ._writeLine(ast.bodyFirst);
                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;)&quot;);
                },

                &quot;raw&quot;: function (ast) {
                    this._visitRaw(ast.stmt);
                },

                &quot;bind&quot;: function (ast) {
                    var info = ast.info;
                    this._write(this._builderVar + &quot;.Bind(&quot;)._visitRaw(info.expression)._writeLine(&quot;, function (&quot; + info.argName + &quot;) {&quot;);
                    this._indentLevel++;

                    if (info.assignee == &quot;return&quot;) {
                        this._writeIndents()
                            ._writeLine(&quot;return &quot; + this._builderVar + &quot;.Return(&quot; + info.argName + &quot;);&quot;);
                    } else {
                        if (info.assignee) {
                            this._writeIndents()
                                ._visitRaw(info.assignee)._writeLine(&quot; = &quot; + info.argName + &quot;;&quot;);
                        }

                        this._visitJscexStatements(ast.stmts);
                    }
                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;})&quot;);
                },

                &quot;if&quot;: function (ast) {

                    for (var i = 0; i &lt; ast.conditionStmts.length; i++) {
                        var stmt = ast.conditionStmts[i];
                        
                        this._write(&quot;if (&quot;)._visitRaw(stmt.cond)._writeLine(&quot;) {&quot;);
                        this._indentLevel++;

                        this._visitJscexStatements(stmt.stmts);
                        this._indentLevel--;

                        this._writeIndents()
                            ._write(&quot;} else &quot;);
                    }

                    this._writeLine(&quot;{&quot;);
                    this._indentLevel++;

                    if (ast.elseStmts) {
                        this._visitJscexStatements(ast.elseStmts);
                    } else {
                        this._writeIndents()
                            ._writeLine(&quot;return &quot; + this._builderVar + &quot;.Normal();&quot;);
                    }

                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;}&quot;);
                },

                &quot;switch&quot;: function (ast) {
                    this._write(&quot;switch (&quot;)._visitRaw(ast.item)._writeLine(&quot;) {&quot;);
                    this._indentLevel++;

                    for (var i = 0; i &lt; ast.caseStmts.length; i++) {
                        var caseStmt = ast.caseStmts[i];

                        if (caseStmt.item) {
                            this._writeIndents()
                                ._write(&quot;case &quot;)._visitRaw(caseStmt.item)._writeLine(&quot;:&quot;);
                        } else {
                            this._writeIndents()._writeLine(&quot;default:&quot;);
                        }
                        this._indentLevel++;

                        this._visitJscexStatements(caseStmt.stmts);
                        this._indentLevel--;
                    }

                    this._writeIndents()
                        ._write(&quot;}&quot;);
                },

                &quot;try&quot;: function (ast) {
                    this._writeLine(this._builderVar + &quot;.Try(&quot;);
                    this._indentLevel++;

                    this._writeIndents()
                        ._visitJscex(ast.bodyStmt)._writeLine(&quot;,&quot;);

                    if (ast.catchStmts) {
                        this._writeIndents()
                            ._writeLine(&quot;function (&quot; + ast.exVar + &quot;) {&quot;);
                        this._indentLevel++;

                        this._visitJscexStatements(ast.catchStmts);
                        this._indentLevel--;

                        this._writeIndents()
                            ._writeLine(&quot;},&quot;);
                    } else {
                        this._writeIndents()
                            ._writeLine(&quot;null,&quot;);
                    }

                    if (ast.finallyStmt) {
                        this._writeIndents()
                            ._visitJscex(ast.finallyStmt)._writeLine();
                    } else {
                        this._writeIndents()
                            ._writeLine(&quot;null&quot;);
                    }
                    this._indentLevel--;

                    this._writeIndents()
                        ._write(&quot;)&quot;);
                },

                &quot;normal&quot;: function (ast) {
                    this._write(this._builderVar + &quot;.Normal()&quot;);
                },

                &quot;throw&quot;: function (ast) {
                    this._write(this._builderVar + &quot;.Throw(&quot;)._visitRaw(ast.stmt[1])._write(&quot;)&quot;);
                },

                &quot;break&quot;: function (ast) {
                    this._write(this._builderVar + &quot;.Break()&quot;);
                },

                &quot;continue&quot;: function (ast) {
                    this._write(this._builderVar + &quot;.Continue()&quot;);
                },

                &quot;return&quot;: function (ast) {
                    this._write(this._builderVar + &quot;.Return(&quot;);
                    if (ast.stmt[1]) this._visitRaw(ast.stmt[1]);
                    this._write(&quot;)&quot;);
                }
            },

            _rawVisitors: {
                &quot;var&quot;: function (ast) {
                    this._write(&quot;var &quot;);

                    var items = ast[1];
                    for (var i = 0; i &lt; items.length; i++) {
                        this._write(items[i][0]);
                        if (items[i].length &gt; 1) {
                            this._write(&quot; = &quot;)._visitRaw(items[i][1]);
                        }
                        if (i &lt; items.length - 1) this._write(&quot;, &quot;);
                    }

                    this._write(&quot;;&quot;);
                },

                &quot;seq&quot;: function (ast) {
                    for (var i = 1; i &lt; ast.length; i++) {
                        this._visitRaw(ast[i]);
                        if (i &lt; ast.length - 1) this._write(&quot;, &quot;); 
                    }
                },

                &quot;binary&quot;: function (ast) {
                    var op = ast[1], left = ast[2], right = ast[3];

                    function needBracket(item) {
                        var type = item[0];
                        return !(type == &quot;num&quot; || type == &quot;name&quot; || type == &quot;dot&quot;);
                    }

                    if (needBracket(left)) {
                        this._write(&quot;(&quot;)._visitRaw(left)._write(&quot;) &quot;);
                    } else {
                        this._visitRaw(left)._write(&quot; &quot;);
                    }

                    this._write(op);

                    if (needBracket(right)) {
                        this._write(&quot; (&quot;)._visitRaw(right)._write(&quot;)&quot;);
                    } else {
                        this._write(&quot; &quot;)._visitRaw(right);
                    }
                },

                &quot;sub&quot;: function (ast) {
                    var prop = ast[1], index = ast[2];

                    function needBracket() {
                        return !(prop[0] == &quot;name&quot;)
                    }

                    if (needBracket()) {
                        this._write(&quot;(&quot;)._visitRaw(prop)._write(&quot;)[&quot;)._visitRaw(index)._write(&quot;]&quot;);
                    } else {
                        this._visitRaw(prop)._write(&quot;[&quot;)._visitRaw(index)._write(&quot;]&quot;);
                    }
                },

                &quot;unary-postfix&quot;: function (ast) {
                    var op = ast[1];
                    var item = ast[2];
                    this._visitRaw(item)._write(op);
                },

                &quot;unary-prefix&quot;: function (ast) {
                    var op = ast[1];
                    var item = ast[2];
                    this._write(op);
                    if (op == &quot;typeof&quot;) {
                        this._write(&quot;(&quot;)._visitRaw(item)._write(&quot;)&quot;);
                    } else {
                        this._visitRaw(item);
                    }
                },

                &quot;assign&quot;: function (ast) {
                    var op = ast[1];
                    var name = ast[2];
                    var value = ast[3];

                    this._visitRaw(name);
                    if ((typeof op) == &quot;string&quot;) {
                        this._write(&quot; &quot; + op + &quot;= &quot;);
                    } else {
                        this._write(&quot; = &quot;);
                    }
                    this._visitRaw(value);
                },

                &quot;stat&quot;: function (ast) {
                    this._visitRaw(ast[1])._write(&quot;;&quot;);
                },

                &quot;dot&quot;: function (ast) {
                    function needBracket() {
                        var leftOp = ast[1][0];
                        return !(leftOp == &quot;dot&quot; || leftOp == &quot;name&quot;);
                    }

                    if (needBracket()) {
                        this._write(&quot;(&quot;)._visitRaw(ast[1])._write(&quot;).&quot;)._write(ast[2]);
                    } else {
                        this._visitRaw(ast[1])._write(&quot;.&quot;)._write(ast[2]);
                    }
                },

                &quot;new&quot;: function (ast) {
                    var ctor = ast[1];

                    this._write(&quot;new &quot;)._visitRaw(ctor)._write(&quot;(&quot;);

                    var args = ast[2];
                    for (var i = 0, len = args.length; i &lt; len; i++) {
                        this._visitRaw(args[i]);
                        if (i &lt; len - 1) this._write(&quot;, &quot;);
                    }

                    this._write(&quot;)&quot;);
                },

                &quot;call&quot;: function (ast) {
                
                    if (_isJscexPattern(ast)) {
                        var indent = this._indent + this._indentLevel * 4;
                        var newCode = _compileJscexPattern(ast, indent);
                        this._write(newCode);
                    } else {

                        var invalidBind = (ast[1][0] == &quot;name&quot;) &amp;&amp; (ast[1][1] == this._binder);
                        if (invalidBind) {
                            this._pos = { inFunction: true };
                            this._buffer = [];
                        }

                        this._visitRaw(ast[1])._write(&quot;(&quot;);

                        var args = ast[2];
                        for (var i = 0; i &lt; args.length; i++) {
                            this._visitRaw(args[i]);
                            if (i &lt; args.length - 1) this._write(&quot;, &quot;);
                        }

                        this._write(&quot;)&quot;);

                        if (invalidBind) {
                            throw (&quot;Invalid bind operation: &quot; + this._buffer.join(&quot;&quot;));
                        }
                    }
                },

                &quot;name&quot;: function (ast) {
                    this._write(ast[1]);
                },

                &quot;object&quot;: function (ast) {
                    var items = ast[1];
                    if (items.length <= 0) { this._write("{ }"); } else this._writeline("{"); this._indentlevel++; for (var i="0;" < items.length; i++) this._writeindents() ._write(stringify(items[i][0]) + ": ") ._visitraw(items[i][1]); if (i items.length - 1) this._writeline(","); this._writeline(""); this._indentlevel--; this._writeindents()._write("}"); }, "array": function (ast) this._write("["); var items="ast[1];" this._visitraw(items[i]); this._write(", "); this._write("]"); "num": this._write(ast[1]); "regexp": this._write(" " ast[1] ast[2]); "string": this._write(stringify(ast[1])); "function": this._visitrawfunction(ast); "defun": "return": (this._pos.infunction) this._write("return"); value="ast[1];" (value) ")._visitraw(value); this._write(";"); this._write("return ")._visitjscex({ type: "return", stmt: ast })._write(";"); "for": this._write("for ("); setup="ast[1];" (setup) this._visitraw(setup); (setup[0] !="var" ) this._write("; condition="ast[2];" (condition) this._visitraw(condition); update="ast[3];" (update) this._visitraw(update); this._write(") currinloop="this._pos.inLoop;" this._pos.inloop="true;" body="ast[4];" this._visitrawbody(body); "for-in": declare="ast[1];" (declare[0]="=" "var") ["var", [["m"]]] this._write("var declare[1][0][0]); this._visitraw(declare); in ")._visitraw(ast[3])._write(") "block": this._writeline("{") this._visitrawstatements(ast[1]); ._write("}"); "while": this._write("while (")._visitraw(condition)._write(") ")._visitrawbody(body); "do": this._write("do (body[0]="=" "block") this._writeline()._writeindents(); (")._visitraw(condition)._write(");"); "if": thenpart="ast[2];" this._write("if ")._visitrawbody(thenpart); elsepart="ast[3];" (elsepart) (thenpart[0]="=" this._writeline("") ._writeindents(); (elsepart[0]="=" "if") this._write("else ")._visitraw(elsepart); ")._visitrawbody(elsepart); "break": (this._pos.inloop || this._pos.inswitch) this._write("break;"); "break", "continue": (this._pos.inloop) this._write("continue;"); "continue", "throw": pos="this._pos;" (pos.intry pos.infunction) this._write("throw ")._visitraw(ast[1])._write(";"); "throw", "conditional": this._write("(")._visitraw(ast[1])._write(") ? (")._visitraw(ast[2])._write(") : (")._visitraw(ast[3])._write(")"); "try": this._writeline("try {"); currintry="this._pos.inTry;" this._pos.intry="true;" catchclause="ast[2];" finallystatements="ast[3];" (catchclause) ._writeline("} catch (" catchclause[0] {") this._visitrawstatements(catchclause[1]); (finallystatements) finally this._visitrawstatements(finallystatements); "switch": this._write("switch (")._visitraw(ast[1])._writeline(") currinswitch="this._pos.inSwitch;" this._pos.inswitch="true;" cases="ast[2];" cases.length; c="cases[i];" this._writeindents(); (c[0]) this._write("case ")._visitraw(c[0])._writeline(":"); this._writeline("default:"); this._visitrawstatements(c[1]); _isjscexpattern(ast) (ast[0] return false; evalname="ast[1];" (evalname[0] evalname[1] compilecall="ast[2][0];" (!compilecall compilecall[0] compilemethod="compileCall[1];" (!compilemethod compilemethod[0] compilemethod[2] jscexname="compileMethod[1];" (!jscexname jscexname[0] jscexname[1] builder="compileCall[2][0];" (!builder builder[0] func="compileCall[2][1];" (!func func[0] true; _compilejscexpattern(ast, indent) buildername="ast[2][0][2][0][1];" funcast="ast[2][0][2][1];" binder="root.binders[builderName];" jscextreegenerator="new" jscextreegenerator(binder); jscexast="jscexTreeGenerator.generate(funcAst);" codegenerator="new" codegenerator(buildername, binder, indent); newcode="codeGenerator.generate(funcAst[2]," jscexast); newcode; compile(buildername, func) funccode="func.toString();" evalcode="eval(Jscex.compile(" stringify(buildername) ", "))" evalcodeast="root.parse(evalCode);" [ "toplevel", "stat", "call", ... ] evalast="evalCodeAst[1][0][1];" 0); root.logger.debug(funccode "\n\n>&gt;&gt;\n\n&quot; + newCode);
            
            return codeGenerator(newCode);
        };

        root.compile = compile;
        
        root.modules[&quot;jit&quot;] = true;
    }
    
    var isCommonJS = (typeof require !== &quot;undefined&quot; &amp;&amp; typeof module !== &quot;undefined&quot; &amp;&amp; module.exports);
    var isAmd = (typeof define !== &quot;undefined&quot; &amp;&amp; define.amd);
    
    if (isCommonJS) {
        module.exports.init = function (root) {
            if (!root.modules[&quot;parser&quot;]) {
                require(&quot;./jscex-parser&quot;).init(root);
            };
            
            init(root);
        }
    } else if (isAmd) {
        define(&quot;jscex-jit&quot;, [&quot;jscex-parser&quot;], function (parser) {
            return {
                init: function (root) {
                    if (!root.modules[&quot;parser&quot;]) {
                        parser.init(root);
                    }
                    
                    init(root);
                }
            };
        });
    } else {
        if (typeof Jscex === &quot;undefined&quot;) {
            throw new Error(&apos;Missing root object, please load &quot;jscex&quot; module first.&apos;);
        }
        
        if (!Jscex.modules[&quot;parser&quot;]) {
            throw new Error(&apos;Missing essential components, please initialize &quot;parser&quot; module first.&apos;);
        }

        init(Jscex);
    }

})();
</=></=>