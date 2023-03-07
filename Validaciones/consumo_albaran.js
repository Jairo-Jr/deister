/** 
 * 
 */
 class w26235 extends workflowProg {
    constructor() {
        super("w26235", ["refter"]);
    }
    
    
    run(data) {
        // Número de líneas con consumo total o parcial.
        var mIntCount = Ax.db.executeGet(`
                <select>
                    <columns>
                        COUNT(*)
                    </columns>
                    <from table='gcomalbh'>
                        <join table='gcomalbl'>
                            <on>gcomalbh.cabid = gcomalbl.cabid</on>
                        </join>
                    </from>
                    <where>
                            gcomalbh.refter = ?
                        AND gcomalbl.auxchr2 IN ('P', 'S')
                        AND  gcomalbh.tipdoc IN ('AGCO', 'AANT')
                    </where>
                </select>
            `, data.refter);
        
        return (mIntCount > 0 ) ? true : false
        
    }
}


/**
 * ADICIONAL: 
 *  - gcommovh: es la tabla de validacion debido a que no existe una tabla fisica gcomalbh
 * 
 * GRUPO DE VALIDACIONES:
 *          RCGO
 *          DGCO
 * EN QA: cod- 26238
 */