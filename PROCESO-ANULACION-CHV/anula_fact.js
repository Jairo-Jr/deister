var mFac = Ax.db.executeQuery(`SELECT docser, auxnum2, facidx, auxnum1, loteid
    FROM cvenfach WHERE docser IN ('F281-01876466',
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
    
        // ANULAR
        try {
    
        var mObjEinvoice = {
            lote_contable: fact.loteid,
            id_factura: fact.facidx,
            auxnum1: fact.auxnum1
        }
    
            Ax.db.beginWork();
            
            //======================================================================
            // Vemos si la factura tiene un efecto en estado "Detracción Autorizada"
            // [cefectos.estado = 'DA'], es decir tiene una gestión
            //======================================================================
    
            console.log(mObjEinvoice.lote_contable)
            var mIntNumges = Ax.db.executeGet(`
                <select>
                    <columns>
                        numges
                    </columns>
                    <from table = 'cefectos'>
                        <join table = 'capuntes'>
                            <on>cefectos.apteid = capuntes.apteid</on>
                        </join>
                    </from>
                    <where>
                            capuntes.loteid = ?
                        AND cefectos.estado = 'DA'
                    </where>
                </select>
            `, mObjEinvoice.lote_contable);
            
            if (mIntNumges != null) {
                //==================================================================
                // Regresamos el efecto a su estado inicial [DP]
                //==================================================================
                Ax.db.call("cefecges_estado_ret", mIntNumges);
                
                //==================================================================
                // Eliminamos el detalle de la gestión
                //==================================================================
                Ax.db.delete("cefecges_det", { pcs_seqno : mIntNumges });
                
                //==================================================================
                // Eliminamos la gestión
                //==================================================================
                Ax.db.delete("cefecges_pcs", { pcs_seqno : mIntNumges });
            }
               
            //======================================================================
            // Eliminamos los efectos del comprobante de venta
            //======================================================================
            var mRsEfectos = Ax.db.executeQuery(`
                <select>
                    <columns>
                        numero
                    </columns>
                    <from table = 'cefectos'>
                        <join table = 'capuntes'>
                            <on>cefectos.apteid = capuntes.apteid</on>
                        </join>
                    </from>
                    <where>
                        capuntes.loteid = ?
                    </where>
                </select>
            `, mObjEinvoice.lote_contable).toJSONArray();
            for (var mRowEfectos of mRsEfectos) {
                Ax.db.delete("cefectos", { numero : mRowEfectos.numero });
            }
            console.log(mRsEfectos, 'XD')
            
            //======================================================================
            // Recuperamos el indicador [movhis] del comprobante de venta
            //======================================================================
            var mIntMovhis = Ax.db.executeGet(`
                <select>
                    <columns>
                        movhis
                    </columns>
                    <from table = 'cvenfach' />
                    <where>
                        facidx = ?
                    </where>
                </select>
            `, mObjEinvoice.id_factura);
            
            //======================================================================
            // Cambiamos el indicador [movhis = -1] en la cabacera de la
            // factura para poder modificarlo
            //======================================================================
            Ax.db.update("cvenfach", 
                { 
                    movhis : -1 
                }, 
                { 
                    facidx : mObjEinvoice.id_factura
                }
            );
            
            //======================================================================
            // Documento Fiscal
            //======================================================================
            var mIntTaxhSeqno = Ax.db.executeGet(`
                <select>
                    <columns>
                        taxh_seqno
                    </columns>
                    <from table = 'ctax_move_head'>
                        <join table = 'capuntes'>
                            <on>ctax_move_head.taxh_apteid = capuntes.apteid</on>
                        </join>
                    </from>
                    <where>
                            capuntes.loteid = ?
                    </where>
                </select>
            `, mObjEinvoice.lote_contable);
            
            Ax.db.update("ctax_move_head", 
                {
                    taxh_import  : 0,
                    taxh_impdiv  : 0,
                    taxh_auxnum1 : 1 // Anulado
                }, 
                {
                    taxh_seqno   : mIntTaxhSeqno
                }
            );
            
            //======================================================================
            // Detalle Fiscal
            //======================================================================
            Ax.db.update("ctax_move_line", 
                {
                    taxl_basimpdiv  : 0,
                    taxl_basimp     : 0,
                    taxl_basnimpdiv : 0,
                    taxl_basnimp    : 0,
                    taxl_cuodeddiv  : 0,
                    taxl_cuoded     : 0,
                    taxl_cuondeddiv : 0,
                    taxl_cuonded    : 0
                }, 
                {
                    taxh_seqno   : mIntTaxhSeqno
                }
            );
            
            //======================================================================
            // Apuntes contables
            //======================================================================
            Ax.db.update("capuntes", 
                {
                    divdeb : 0,
                    divhab : 0,
                    debe   : 0,
                    haber  : 0,
                    codcon : "AN" // Anulado ventas
                }, 
                {
                    loteid : mObjEinvoice.lote_contable
                }
            );
            
            //======================================================================
            // Vencimientos de la factura
            //======================================================================
            Ax.db.update("cvenefec", 
                {
                    import : 0,
                    impdiv : 0,
                    impiva : 0,
                    impret : 0
                }, 
                {
                    facidx : mObjEinvoice.id_factura
                }
            );
            
            //======================================================================
            // Impuestos de la factura
            //======================================================================
            Ax.db.update("cvenfach_tax", 
                {
                    tax_basimp  : 0,
                    tax_cuoded  : 0,
                    tax_basnimp : 0,
                    tax_cuonded : 0
                }, 
                {
                    facidx : mObjEinvoice.id_factura
                }
            );
            
            //======================================================================
            // Líneas de la factura
            //======================================================================
            Ax.db.update("cvenfacl", 
                {
                    precio      : 0,
                    totnet      : 0,
                    tax_basimp1 : 0,
                    tax_oper1   : 0,
                    tax_code1   : 0,
                    tax_basimp4 : 0,
                    tax_oper4   : 0,
                    tax_code4   : 0
                }, 
                {
                    facidx : mObjEinvoice.id_factura
                }
            );
            
            //======================================================================
            // Cabecera de la factura
            //======================================================================
            Ax.db.update('cvenfach', 
                {
                    auxnum2      : 1,                 // Anulado
                    impnet       : 0,                 // Importe neto en cero
                    dtocab       : 0,                 // descuento general en cero
                    imptot       : 0,                 // Importe total en cero
                    user_updated : Ax.db.getUser(),   // Usuario que hace la baja
                    date_updated : new Ax.util.Date() // Fecha de la baja
                }, 
                { 
                    facidx       : mObjEinvoice.id_factura 
                }
            );
            
            //======================================================================
            // Devolvemos el indicador [movhis] en la cabacera de la factura 
            // a su valor inicial
            //======================================================================
            Ax.db.update("cvenfach", 
                { 
                    movhis : mIntMovhis 
                }, 
                { 
                    facidx : mObjEinvoice.id_factura
                }
            );
    
            /**
             * Actualiza crp_chv_vtas_h
            */
            Ax.db.update("crp_chv_vtas_h", 
                { 
                    estado_integracion : 6 
                }, 
                { 
                    seqno : mObjEinvoice.auxnum1
                }
            );
            
            
            Ax.db.commitWork();
            
        }  catch (error) {
            
            Ax.db.rollbackWork();
            
            throw new Ax.ext.Exception(Ax.util.Error.getMessage(error));
        }
    });
    
    return mFac;