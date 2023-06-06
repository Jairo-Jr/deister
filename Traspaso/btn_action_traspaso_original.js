var mStrCodpar    = Ax.context.field.codpar;
    var mStrCodpre    = Ax.context.data.codpre;
    var mStrEmpcode   = Ax.context.data.empcode;
    var mStrEstado    = Ax.context.data.estado;
    var mIntLinid     = Ax.context.data.linid;
    var mStrTabori    = Ax.context.data.tabori;
    var mIntSeqnoComp = Ax.context.data.auxfec1;
    
    if (mStrTabori == "gcomfach" && mStrEstado == 'A'){
    
        var mStrEstado = Ax.db.executeGet(`
            SELECT cpar_parprel.estado
              FROM cpar_parprel
             WHERE codpre  = ?
               AND codpar  = ?
               AND empcode = ?
        `, mStrCodpre, mStrCodpar, mStrEmpcode);
        
        if (mStrEstado != 'AC'){
            throw new Ax.ext.Exception(`El estado de la partida a trasferir [${mStrCodpar}] se encuentra bloqueada.`);
        }
    
        var mStrUserCode = Ax.ext.user.getCode();
    
        /**
         * Se actualiza en "Ingresos y gastos" la nueva partida
         **/
        Ax.db.update('cpar_premovi', 
            {
                codpar       : mStrCodpar,
                user_updated : mStrUserCode,
                date_updated : new Ax.util.Date()
            }, 
            {
                linid : mIntLinid 
            }
        ); 
        
        /**
         * Obtenemos la empresa 
         **/
        var mStrEmpcode = Ax.db.executeGet(`
            SELECT cinmcomp.empcode
              FROM cinmcomp
             WHERE cinmcomp.seqno = ?
        `,mIntSeqnoComp);
        
        /**
         * Obtenemos el bien y elemento relacionado al
         * presupuesto y a la nueva partida ingresada
         **/
        var mObjCinmelem = Ax.db.executeQuery(`
            SELECT cinmelem.codinm,
                   cinmelem.codele
              FROM cinmelem
             WHERE cinmelem.codpre  = ?
               AND cinmelem.codpar  = ?
               AND cinmelem.empcode = ?
        `,mStrCodpre, mStrCodpar, mStrEmpcode).toOne();
        
        /**
         * Se actualiza en el componente el nuevo bien y elemento relacionado
         * al presupuesto original y a la nueva partida
         **/
        Ax.db.update('cinmcomp', 
            {
                codinm       : mObjCinmelem.codinm,
                codele       : mObjCinmelem.codele,
                user_updated : mStrUserCode,
                date_updated : new Ax.util.Date()
            }, 
            {
                seqno : mIntSeqnoComp 
            }
        );     
    }else if (mStrTabori == "gcomfach" && mStrEstado != 'A'){
        throw new Ax.ext.Exception('El registro debe tener estado Aplicado[A]');
    }