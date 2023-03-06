function main(data) { 
    
    // ===============================================================
    // Definición de variables generales
    // ===============================================================
    var mStrOrderRuc            = data.orderRuc;
    var mStrPurchaseType        = data.purchaseType;
    var mStrTabnameHead         = '';
    var mStrTabnameLine         = '';
    var mDateFecmov             = '';
    var mSqlcond                = '';
    var mIntExistsOrderPurchase = '';
    var mIntExistsRUC           = '';
    var mObjResponse            = {};    
    var PurchaseHead            = [];
    
    // ===============================================================
    // Segun el tipo de compra se obtiene determinados valores a
    // devolver a IBTH
    // [OC] Order de compra.
    // [DEV] Devolución 
    // =============================================================== 
    switch (mStrPurchaseType){
        case 'OC':
            mSqlcond        = `AND tipdoc = 'PLOG' AND codalm ='CRP0502P'`;
            mStrTabnameHead = 'gcompedh';
            mStrTabnameLine = 'gcompedl';
            mDateFecmov     = `fecha`;
            break;
        case 'DEV':
            mSqlcond        = `AND tipdoc = 'DLOG' AND almori ='CRP0502P'`;
            mStrTabnameHead = 'gcomalbh';
            mStrTabnameLine = 'gcomalbl';
            mDateFecmov     = `fecmov`;
            break;
        default:
            mObjResponse.PurchaseHeadResponse = { 
                Response     : { Status :  "ERROR",
                                 Message : `Tipo de orden [${mStrPurchaseType}] no contemplada. Comunicarlo al Dpto. de Sistemas`
                               }
            };
            
            return mObjResponse;
    };

    mIntExistsOrderPurchase = Ax.db.executeGet(`
        <select>
            <columns>COUNT(*)</columns>
            <from table='${mStrTabnameHead}'/>
            <where>
                docser = ?
            </where>
        </select> 
    `, mStrOrderRuc);
    
    mIntExistsRUC = Ax.db.executeGet(`
        <select>
            <columns> 
               COUNT(*)
            </columns>
            <from table='ctercero'/>
            <where>
                ctercero.cif = ?
            </where>
        </select> 
    `, mStrOrderRuc);

    // ===============================================================
    // Validación de datos de entrada  
    // =============================================================== 
    if (mIntExistsOrderPurchase == 0 && mIntExistsRUC == 0){
        
        mObjResponse.PurchaseHeadResponse = { 
            Response     : { Status :  "ERROR",
                             Message : `[${mStrOrderRuc}] no esta registrado en Axional`
                           }
        };
        
        return mObjResponse; 
    }
    
   var mRsPurchase = Ax.db.executeQuery(` 
        <select>
            <columns> 
                tabnameh.docser                                 <alias name='code' />,
                ctercero.cif                                    <alias name='provider' />,
                ctercero.nombre                                 <alias name='nombre' />,
                '1'                                             <alias name='version' />,
                CASE WHEN tabnameh.tipdoc = 'PLOG' THEN 'OC'         
                     ELSE 'DEV'
                END                                             <alias name='type' />,
                CASE WHEN tabnameh.tipdoc = 'PLOG' THEN TO_CHAR(tabnameh.${mDateFecmov}, "%Y-%m-%d %H:%M:%S")         
                     ELSE TO_CHAR(tabnameh.${mDateFecmov}, "%Y-%m-%d %H:%M:%S")
                END                                             <alias name='purchaseDate' />,
                COUNT(tabnamel.cabid)                           <alias name='numberItems' />
            </columns>
            <from table='${mStrTabnameHead}' alias = 'tabnameh'>
                <join table='ctercero'>
                    <on>tabnameh.tercer = ctercero.codigo</on>
                </join>
                <join table='${mStrTabnameLine}' alias = 'tabnamel'>
                    <on>tabnameh.cabid = tabnamel.cabid</on>
                </join>
            </from> 
            <where>
                <!-- ================================================================================== -->
                <!-- Filtros:                                                                           -->
                <!-- (1) Parámetro de entrada de IBTH puede ser una OC o RUC del proveedor.             -->
                <!-- (2) Aplica a documentos validados en estado "Pendientes"[N] y "Parciales"[P].      --> 
                <!-- (3) Se acota por almacén de IBTH y la tipología de logística.                      -->
                <!-- ================================================================================== -->
                    (tabnameh.docser = ? OR ctercero.cif = ?)
                AND (tabnameh.estcab = 'V' AND tabnameh.estado IN ('N','P'))
                ${mSqlcond}
            </where>
            <group>
                1,2,3,4,5,6
            </group>
        </select> 
    `, mStrOrderRuc, mStrOrderRuc).toMemory();
    
    var mIntCountRsPurchase = mRsPurchase.getRowCount();
    
    if (mIntCountRsPurchase > 0){
        PurchaseHead = mRsPurchase.toJSONArray();
        
        mObjResponse.PurchaseHeadResponse = { 
            Response     : { Status :  "OK" },
            PurchaseHead 
            
        };
        
        PurchaseHead.forEach(mPurchase => {
            
            Ax.db.update(mStrTabnameHead, 
                {   
                    indmod  : 'N',
                    auxnum2 : 1
                }, 
                {
                    docser: mPurchase.code
                }
            ); 

        });
        
      return new Ax.net.HttpResponseBuilder()            
            .status(200)
            .entity(mObjResponse)
            .type("application/json")
            .build();
    }else{
        
        if(mIntCountRsPurchase == 0){
            
            mObjResponse.PurchaseHeadResponse = { 
                Response     : { Status :  "ERROR",
                                 Message : `No hay datos a devolver para el parámetro [${mStrOrderRuc}] ingresado.`
                               }
            };
            
            return mObjResponse;
        }
        
    }
}