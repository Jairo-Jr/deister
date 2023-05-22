class w26249 extends workflowProg {
    constructor() {
        super('w26249', ['cabid']);
    }
    run(data) {
        
        /*var mObjGarticul = Ax.db.executeQuery(`
                <select>
                    <columns> 
                        garticul.codtip
                    </columns>
                    <from table='garticul'>
                    </from>
                    <where>
                        garticul.codigo = ? 
                    </where>
                </select>`, data.codart).toOne(); */
                
                
        var mIntCantArticulos = Ax.db.executeGet(`
            <select>
                <columns> 
                    COUNT(*)
                </columns>
                <from table='geanmovl'> 
                    <join table='garticul'>
                        <on>geanmovl.codart = garticul.codigo</on>
                    </join>
                </from>
                <where>
                    garticul.codtip = '02'
                    AND geanmovl.cabid = ?
                </where>
            </select>`, data.cabid);

        return    (mIntCantArticulos > 0) ? true : false ;
        
    } 
}


/**
 * Num: 26249
 * 
 * Desc: NO SE PERMITEN ARTÍCULOS DE TIPO '02' FARMACIA
 * 
 * Modo: Documento
 * 
 * Tabla: geanmovh
 * 
 * Notas: Cuando un artículo tiene informado el tipo '02 FARMACIA' no puede añadirse, porque son ajustes de logística.
 * 
 */