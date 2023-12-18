import https from "https"

const _callbacks = {}
let _cbId = 0

class VertexGateway {
    static async Run(text, functions = [],data, config) {
        const values = {
            "contents": [
                {
                    "role": "user",
                    "parts": {
                        text
                    }
                }
            ],
            "tools": [
                {
                    "function_declarations": functions.map(f => {
                        return f.declaration
                    })
                }
            ]
        }
        return new Promise((resolve, reject) => {
            const cbId = _cbId++
            _callbacks[cbId] = { resolve, reject }
            VertexGateway.Send(cbId, values, functions,data, config)
        })
    }

    static async ParseResponse(response, id, values, functions,data, config) {
        let resend = false
        for (let i = 0; i < response[0].candidates[0].content.parts.length; i++) {
            const p = response[0].candidates[0].content.parts[i]
            if (p.functionCall) {
                const funcResult = await VertexGateway.CallFuncs(p.functionCall, functions,data)

                //Add rolemodel
                let roleModel = values.contents.find(p => p.role === "model")
                if (!roleModel) {
                    roleModel = {
                        role: "model",
                        parts: []
                    }
                    values.contents.push(roleModel)
                }
                roleModel.parts.push({
                    "functionCall": {
                        "name": p.functionCall.name,
                        "args": p.functionCall.args
                    }
                })

                //Add function responce
                let roleFunc = values.contents.find(p => p.role === "function")
                if (!roleFunc) {
                    roleFunc = {
                        role: "function",
                        parts: []
                    }
                    values.contents.push(roleFunc)
                }
                roleFunc.parts.push({
                    "functionResponse": {
                        "name": p.functionCall.name,
                        "response": {
                            "name": p.functionCall.name,
                            "content": funcResult
                        }
                    }
                })
                resend = true
            }
        }
        if (resend) {
            VertexGateway.Send(id, values, functions,data,  config)
            return
        }
        let txt = ""
        let end = false
        for (let i = 0; i < response.length; i++) {
            const cnd = response[i].candidates[0]
            for (let k = 0; k < cnd.content.parts.length; k++) {
                const p =cnd.content.parts[k]
                if (p.text) {
                    txt += p.text
                }
            }
            end = true
        }

        if (end) {
            const callback = _callbacks[id]
            if (callback) {
                callback.resolve(txt)
                delete _callbacks[id]
            }
        }
    }

    static CallFuncs(funcData, functions, data) {
        const func = functions.find(f => f.declaration.name === funcData.name)
        if (func) {
            return func.handler(funcData.args,data)
        }
    }

    static async Send(id, values, functions,data,  config) {
        const options = {
            hostname: `${config.location}-aiplatform.googleapis.com`,
            path: `/v1/projects/${config.project}/locations/${config.location}/publishers/google/models/${config.model}:streamGenerateContent`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'application/json; charset=utf-8',
            }
        }
        const response = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    const obj = JSON.parse(data)
                    resolve(obj)
                })
            })
            req.on('error', error => reject(error))
            req.write(JSON.stringify(values))
            req.end()
        })
        VertexGateway.ParseResponse(response, id, values, functions,data,  config)
    }


}

export default VertexGateway