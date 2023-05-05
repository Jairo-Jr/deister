class w26246 extends workflowProg {
    constructor() {
        super("w26246", ["cabid"]);
    }
    
    
    run(data) {
        // Número de albaranes sin contabilizar
        var mIntCount = Ax.db.executeGet(`
            <select>
                <columns>
                    COUNT(*)
                </columns>
                <from table='gcomalbh' />
                <where>
                    gcomalbh.cabid IN (SELECT gcomfacl.cabori
                             FROM gcomfacl
                            WHERE gcomfacl.cabid  = ?
                              AND gcomfacl.tabori = 'gcommovh')
                    AND gcomalbh.fconta IS NULL
                </where>
            </select>
        `, data.cabid);
        
        return (mIntCount > 0 ) ? true : false
        
    }
}



/**
 * 
 * prog_num: 26246
 * desc: FACTURA CON ALBARANES SIN CONTABILIZAR
 * tabla: gcomfach
 * 
 */