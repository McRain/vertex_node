# vertex_node

Use 

const functions = [
      {
        handler: () => {
          return new Date().toLocaleString()
        },
        declaration: {
          "name": "getDateTime",
          "description": "This function is used when you need to find out today's date or current time.",
          "parameters": {
            "type": "STRING",
            "properties": {},
            "required": []
          }
        }
      }
    ]

const result = await VertexGateway.Run("What time is it and what date is it today?", functions,{
            model:"gemini-pro",
            location:vertex_ai.preview.location,
            project:vertex_ai.preview.project,
            token:await vertex_ai.preview.token
        })


      
