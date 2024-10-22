var mFac = Ax.db.executeQuery(`SELECT docser, auxnum2, facidx, auxnum1 
    FROM cvenfach WHERE docser IN ('F281-01876465',
    'F281-01876466',
    'F281-01876467',
    'F281-01876468',
    'F281-01876469',
    'F281-01876470',
    'F281-01876471',
    'F281-01876472',
    'F281-01876473',
    'F281-01876474',
    'F281-01876475',
    'F281-01876476',
    'F281-01876477',
    'F281-01876478',
    'F281-01876479',
    'F281-01876480',
    'F281-01876481',
    'F281-01876482',
    'F281-01876483',
    'F281-01876484',
    'F281-01876485',
    'F281-01876486',
    'F281-01876487',
    'F281-01876488',
    'F281-01876489',
    'F281-01876490',
    'F281-01876491',
    'F281-01876492')`).toMemory();
    
    mFac.forEach(fact => {
        
    
        // Contabiliza 
        Ax.db.call("ccomven_fach_wb_account", "cvenfach", fact.facidx);
    
        /**
         * [14-05-2024]                                                               
         * Proceso custom para actualizar en los apuntes el grupo y código auxiliar,  
         * con base en lo establecido en ccuentas:                                    
         *  - gcomfach                                                                
         *  - ccomfach                                                                
         *  - gvenfach
         *  - cvenfach
         */
        var mIntLoteid = Ax.db.executeGet(`
            <select>
                <columns>
                    cvenfach.loteid
                </columns>
                <from table='cvenfach' />
                <where>
                    cvenfach.facidx = ?
                </where>
            </select>
        `, fact.facidx);
        
        if(mIntLoteid != null && mIntLoteid > 0){
            var mRsCapuntes = Ax.db.executeQuery(`
                <select>
                    <columns>
                        capuntes.apteid,
                        ccuentas.codaux,
                        cvenfach.tercer
                    </columns>
                    <from table='cvenfach'>
                        <join table = 'capuntes'>
                            <on>cvenfach.loteid = capuntes.loteid</on>
                            <join table = 'ccuentas'>
                                <on>capuntes.cuenta = ccuentas.codigo</on>
                                <on>capuntes.placon = ccuentas.placon</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        cvenfach.facidx = ?
                        AND ccuentas.codaux = 'TERCER'
                    </where>
                </select>
            `, fact.facidx).toJSONArray();
            
            mRsCapuntes.forEach(mCapunte => {
                Ax.db.execute(`
                    UPDATE capuntes
                       SET codaux = '${mCapunte.codaux}',
                           ctaaux = '${mCapunte.tercer}'
                     WHERE apteid = ${mCapunte.apteid}
                `);
            })
        }
    });
    
    return mFac;