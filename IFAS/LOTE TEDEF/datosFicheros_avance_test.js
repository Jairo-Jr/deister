function datosFicheros(pdata, pIntIndicador) {
    
    console.time('INICIO DE ARMADO');
    
    Ax.db.execute(`DELETE fas_tedef_dfac_test WHERE tdfac_lote = ?`, pdata.tdl_nrolote);
    Ax.db.execute(`DELETE fas_tedef_date_test WHERE tdate_nrolote = ?`, pdata.tdl_nrolote);
    Ax.db.execute(`DELETE fas_tedef_dserv_test WHERE tdserv_nrolote = ?`, pdata.tdl_nrolote);
    Ax.db.execute(`DELETE fas_tedef_dfarm_test WHERE tdfarm_nrolote = ?`, pdata.tdl_nrolote);

    // var mStrCondFact = `AND fas_factura_venta.fvh_numero = 'F418-00047108'`;
    // var mStrCondFact = `AND fas_factura_venta.fvh_numero = 'F418-00046085'`;
    var mStrCondFact = `AND 1=1`;

	/**
     * Se redondea hacia arriba cuando el tercer decimal es mayor que 5, 
     * de lo contrario se redondea hacia abajo
    */
    function ajusteDiferenciaFarmAte(pNroLote, pNumFac, pNumFichAte, pDiffCopago, pCovigv) {
        
        let mArrDfarm = Ax.db.executeQuery(`
            <select>
                <columns>
                    tdfarm_serial,
                    tdfarm_cpgprdfarm,
                    tdfarm_cpgprd_round
                </columns>
                <from table = 'fas_tedef_dfarm_test' />
                <where>
                        tdfarm_nrolote = ?
                    AND tdfarm_nrodocpg = ?
                    AND tdfarm_pres = ?
                    AND tdfarm_prdexeifv = 'IGV'
                </where>
                <order>
                    tdfarm_pres, tdfarm_corprd
                </order>
            </select>
        `, pNroLote, pNumFac, pNumFichAte).toJSONArray();

        /**
         * Proteccion para evitar bucle infinito
        */
        let mNumMaxIte = Ax.math.bc.mul(Ax.math.bc.abs(pDiffCopago), 100);

        while(pDiffCopago != 0.00 && mNumMaxIte > 0){
            let i = 0;
            mArrDfarm.forEach(rowDfarm => {
                if(pDiffCopago > 0.00){
                    if(rowDfarm.tdfarm_cpgprd_round > 0.00){
                        Ax.db.update('fas_tedef_dfarm_test',
                            {
                                "tdfarm_cpgprdfarm"     : Ax.math.bc.sub(rowDfarm.tdfarm_cpgprd_round, 0.01),
                                "tdfarm_cpgprd_round"   : Ax.math.bc.sub(rowDfarm.tdfarm_cpgprd_round, 0.01)
                            },
                            {
                                "tdfarm_serial"			: rowDfarm.tdfarm_serial
                            }
                        );

                        pDiffCopago = Ax.math.bc.sub(pDiffCopago, 0.01);
                        pCovigv = Ax.math.bc.sub(pCovigv, 0.01);
                        mArrDfarm[i].tdfarm_cpgprd_round = Ax.math.bc.sub(rowDfarm.tdfarm_cpgprd_round, 0.01);
                    }
                    
                } else if(pDiffCopago < 0.00){
                    Ax.db.update('fas_tedef_dfarm_test',
                        {
                            "tdfarm_cpgprdfarm"     : Ax.math.bc.add(rowDfarm.tdfarm_cpgprd_round, 0.01),
                            "tdfarm_cpgprd_round"   : Ax.math.bc.add(rowDfarm.tdfarm_cpgprd_round, 0.01)
                        },
                        {
                            "tdfarm_serial"			: rowDfarm.tdfarm_serial
                        }
                    );
                    pDiffCopago = Ax.math.bc.add(pDiffCopago, 0.01);
                    pCovigv = Ax.math.bc.add(pCovigv, 0.01);
                    mArrDfarm[i].tdfarm_cpgprd_round = Ax.math.bc.add(rowDfarm.tdfarm_cpgprd_round, 0.01);
                }
                i++;
            });

            mNumMaxIte = Ax.math.bc.sub(mNumMaxIte, 0.01);
        }


        let mArrServ = Ax.db.executeQuery(`
            <select>
                <columns>
                    tdserv_serial,
                    tdserv_cpgvarproc,
                    tdserv_cpgvr_round
                </columns>
                <from table = 'fas_tedef_dserv_test' />
                <where>
                        tdserv_nrolote = ?
        			AND tdserv_nrodocpg = ?
                    AND tdserv_pres = ?
                    AND tdserv_servexeimp = 'IGV'
                </where>
                <order>
                    tdserv_pres, tdserv_corserv
                </order>
            </select>
        `, pNroLote, pNumFac, pNumFichAte).toJSONArray();


        /**
         * Proteccion para evitar bucle infinito
        */
        mNumMaxIte = Ax.math.bc.mul(Ax.math.bc.abs(pDiffCopago), 100);

        while(pDiffCopago != 0.00 && mNumMaxIte > 0){
            let i = 0;
            mArrServ.forEach(rowDserv => {
                if(pDiffCopago > 0.00){
                    if(rowDserv.tdserv_cpgvr_round > 0.00){
                        Ax.db.update('fas_tedef_dserv_test',
                            {
                                "tdserv_cpgvarproc"     : Ax.math.bc.sub(rowDserv.tdserv_cpgvr_round, 0.01),
                                "tdserv_cpgvr_round"   : Ax.math.bc.sub(rowDserv.tdserv_cpgvr_round, 0.01)
                            },
                            {
                                "tdserv_serial"			: rowDserv.tdserv_serial
                            }
                        );

                        pDiffCopago = Ax.math.bc.sub(pDiffCopago, 0.01);
                        pCovigv = Ax.math.bc.sub(pCovigv, 0.01);
                        mArrServ[i].tdserv_cpgvr_round = Ax.math.bc.sub(rowDserv.tdserv_cpgvr_round, 0.01);
                    }
                    
                } else if(pDiffCopago < 0.00){
                    Ax.db.update('fas_tedef_dserv_test',
                        {
                            "tdserv_cpgvarproc"     : Ax.math.bc.add(rowDserv.tdserv_cpgvr_round, 0.01),
                            "tdserv_cpgvr_round"   : Ax.math.bc.add(rowDserv.tdserv_cpgvr_round, 0.01)
                        },
                        {
                            "tdserv_serial"			: rowDserv.tdserv_serial
                        }
                    );
                    pDiffCopago = Ax.math.bc.add(pDiffCopago, 0.01);
                    pCovigv = Ax.math.bc.add(pCovigv, 0.01);
                    mArrServ[i].tdserv_cpgvr_round = Ax.math.bc.add(rowDserv.tdserv_cpgvr_round, 0.01);
                }
                i++;
            });

            mNumMaxIte = Ax.math.bc.sub(mNumMaxIte, 0.01);
        }

        // Multiplicamos por 1000 y aplicamos Math.floor para obtener la parte entera
        // const tercerDecimal = Math.floor((numero * 1000) % 10);
        // return tercerDecimal > 5 ? Ax.math.bc.of(numero).setScale(2, Ax.math.bc.RoundingMode.HALF_UP): Ax.math.bc.of(numero).setScale(2, Ax.math.bc.RoundingMode.DOWN);

        return pCovigv;
    }

	// Protección ante algún error, realizamos un rollback
	Ax.db.commitWork();
	Ax.db.beginWork();

	// Declaración de variables
	let mStrFacturas		= '';
	let mStrFactDate		= '';
	let mStrFactDfarm		= '';
	let mStrEpPadre			= '';
	let mIntDServ			= 0;
	let contador			= 0;
	let mStrFact_serv		= '';
	let mStrFact_ate		= '';
	let mStrLiq_farm		= '';
	let mStrLiq_serv		= '';
	let mStrLiq_ate			= '';
	let mCountFichFarm		= 1;
	let mCountFichServ		= 1;
	let mCountFichAte		= 1;
	let mIndRound			= 0;
	let mStrLote			= pdata.tdl_nrolote;
	let mStrCentro			= pdata.tdf_centro;
	let mStrSqlCol			= '';
	let mStrSqlOrden		= '';
	let mStrSqlCond			= '';
	let aux_episodio_padre 	= '';
    let aux_num_carta 		= '';
    let aux_num_fact 		= '';
    let mStrIndGlobal 		= 'N';
    let mObjIndFactGlob 	= {};

    // Obtenemos el Mecanismo de pago del lote para identificar si es PPS u otro mecanismo de pago
	let mStrMecPago		= Ax.db.executeGet(`
		<select>
			<columns>
				tdl_meca_pago
			</columns>
			<from table = 'fas_tedef_lote' />
			<where>
				tdl_nrolote = ?
			</where>
		</select>
	`, mStrLote);

    /*****************************************************************************************/
    /************************************** FACTURACIÓN **************************************/
    /*****************************************************************************************/

    /**
	 * Si es diferente a PPS, se tomará en cuenta el impuesto, de lo contrario,
	 * no se incluirá en la búsqueda de data
	 */
	let mStrSqlSegOrden
	if (mStrMecPago == 'PPS') {
		mStrSqlCol		= 'fvh_numero, liql_impuesto,';
		mStrSqlSegOrden	= '<order>liql_impuesto DESC</order>';
	} else {
		mStrSqlCol		= 'fvh_numero,'
	}

	let mRsDatosDfacFichero = Ax.db.executeQuery(`
		<select>
			<columns>
				DISTINCT
				${mStrSqlCol}
				tdf_nrolote
			</columns>
			<from table = 'fas_tedef_factura'>
				<join table = 'fas_factura_venta'>
					<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
					<join table = 'fas_factura_venta_enlace'>
						<on>fas_factura_venta.fvh_id = fas_factura_venta_enlace.fvh_id</on>
						<join table = 'fas_liquidacion'>
							<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
							<join table = 'fas_liquidacion_linea'>
								<on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
								<on>fas_factura_venta_enlace.liql_id = fas_liquidacion_linea.liql_id</on>
							</join>
						</join>
					</join>
				</join>
			</from>
			<where>
					tdf_nrolote	= ?
				AND tdf_centro	= ?
				AND liql_estado IN ('P', 'F')
                ${mStrCondFact}
			</where>
			${mStrSqlSegOrden}
		</select>
	`, mStrLote, mStrCentro);
    

	mRsDatosDfacFichero.forEach((mRowData) => {

        // let mBcSumCpFjIgv = 0.00;
		// let mBcSumCpFjExo = 0.00;
		// let mBcSumCpVrIgv = 0.00;
		// let mBcSumCpVrExo = 0.00;

        // let mObjAteSumRound = Ax.db.executeQuery(`
		// 	<select>
		// 		<columns>
		// 			SUM(tdate_cpgfijaf_round)	tdate_cpgfijaf_round,
		// 			SUM(tdate_cpgfijexo_round)	tdate_cpgfijexo_round,
		// 			SUM(tdate_cpgvaraf_round)	tdate_cpgvaraf_round,
		// 			SUM(tdate_cpgvarexo_round)	tdate_cpgvarexo_round
		// 		</columns>
		// 		<from table = 'fas_tedef_date_test' />
		// 		<where>
		// 				tdate_nrolote	= ?
		// 			AND tdate_nrodocpg	= ?
		// 			AND tdate_centro	= ?
		// 		</where>
		// 	</select>
		// `, mStrLote, mRowData.fvh_numero, mStrCentro).toOne();

        // let mRsFarmSumRound = Ax.db.executeQuery(`
		// 	<select>
		// 		<columns>
		// 			tdfarm_prdexeifv,
		// 			NVL(SUM(tdfarm_cpgprd_round), 0.00) tdfarm_cpgprd_round
		// 		</columns>
		// 		<from table = 'fas_tedef_dfarm_test' />
		// 		<where>
		// 				tdfarm_nrolote	= ?
		// 			AND tdfarm_nrodocpg	= ?
		// 			AND tdfarm_centro	= ?
		// 		</where>
		// 		<group>
		// 			tdfarm_prdexeifv
		// 		</group>
		// 	</select>
		// `, mStrLote, mRowData.fvh_numero, mStrCentro);

        // let mRsServSumRound = Ax.db.executeQuery(`
		// 	<select>
		// 		<columns>
		// 			tdserv_servexeimp,
		// 			NVL(SUM(tdserv_cpgvr_round), 0.00) tdserv_cpgvr_round,
		// 			NVL(SUM(tdserv_cpgfj_round), 0.00) tdserv_cpgfj_round
		// 		</columns>
		// 		<from table = 'fas_tedef_dserv_test' />
		// 		<where>
		// 				tdserv_nrolote	= ?
		// 			AND tdserv_nrodocpg	= ?
		// 			AND tdserv_centro	= ?
		// 		</where>
		// 		<group>
		// 			tdserv_servexeimp
		// 		</group>
		// 	</select>
		// `, mStrLote, mRowData.fvh_numero, mStrCentro);

		// let mRsAte = Ax.db.executeQuery(`
		// 	<select>
		// 		<columns>
		// 			tdate_serial,
		// 			tdate_cpgfijaf_round,
		// 			tdate_cpgfijexo_round,
		// 			tdate_cpgvaraf_round,
		// 			tdate_cpgvarexo_round
		// 		</columns>
		// 		<from table = 'fas_tedef_date_test' />
		// 		<where>
		// 				tdate_nrolote	= ?
		// 			AND tdate_nrodocpg	= ?
		// 			AND tdate_centro	= ?
		// 		</where>
		// 	</select>
		// `, mStrLote, mRowData.fvh_numero, mStrCentro).toMemory();

        // mRsFarmSumRound.forEach((mRowFarmSumRound) => {
		// 	if (mRowFarmSumRound.tdfarm_prdexeifv == 'IGV') {
		// 		mBcSumCpVrIgv = Ax.math.bc.add(mBcSumCpVrIgv, mRowFarmSumRound.tdfarm_cpgprd_round)
		// 	} else if (mRowFarmSumRound.tdfarm_prdexeifv == 'EXONERADO') {
		// 		mBcSumCpVrExo = Ax.math.bc.add(mBcSumCpVrExo, mRowFarmSumRound.tdfarm_cpgprd_round)
		// 	} 
		// });
		// mRsFarmSumRound.close();

		// mRsServSumRound.forEach((mRowServSumRound) => {
		// 	if (mRowServSumRound.tdserv_servexeimp == 'IGV') {
		// 		mBcSumCpVrIgv = Ax.math.bc.add(mBcSumCpVrIgv, mRowServSumRound.tdserv_cpgvr_round)
		// 		mBcSumCpFjIgv = Ax.math.bc.add(mBcSumCpFjIgv, mRowServSumRound.tdserv_cpgfj_round)
		// 	} else if (mRowServSumRound.tdserv_servexeimp == 'EXONERADO') {
		// 		mBcSumCpVrExo = Ax.math.bc.add(mBcSumCpVrExo, mRowServSumRound.tdserv_cpgvr_round)
		// 		mBcSumCpFjExo = Ax.math.bc.add(mBcSumCpFjExo, mRowServSumRound.tdserv_cpgfj_round)
		// 	}
		// })
		// mRsServSumRound.close();

        // mBcSumCpFjIgv = Ax.math.bc.sub(mBcSumCpFjIgv, (mObjAteSumRound.tdate_cpgfijaf_round || 0));
		// mBcSumCpFjExo = Ax.math.bc.sub(mBcSumCpFjExo, (mObjAteSumRound.tdate_cpgfijexo_round || 0));
		// mBcSumCpVrIgv = Ax.math.bc.sub(mBcSumCpVrIgv, (mObjAteSumRound.tdate_cpgvaraf_round || 0));
		// mBcSumCpVrExo = Ax.math.bc.sub(mBcSumCpVrExo, (mObjAteSumRound.tdate_cpgvarexo_round || 0));

        // if (mBcSumCpFjIgv > 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpFjIgv > 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgfijaf_round"	: Ax.math.bc.add(mRowAte.tdate_cpgfijaf_round, 0.01),
		// 					"tdate_cpgfijaf"		: Ax.math.bc.add(mRowAte.tdate_cpgfijaf_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpFjIgv = Ax.math.bc.sub(mBcSumCpFjIgv, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// } else if (mBcSumCpFjIgv < 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpFjIgv < 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgfijaf_round"	: Ax.math.bc.sub(mRowAte.tdate_cpgfijaf_round, 0.01),
		// 					"tdate_cpgfijaf"		: Ax.math.bc.sub(mRowAte.tdate_cpgfijaf_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpFjIgv = Ax.math.bc.add(mBcSumCpFjIgv, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// }

        // if (mBcSumCpFjExo > 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpFjExo > 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgfijexo_round"	: Ax.math.bc.add(mRowAte.tdate_cpgfijexo_round, 0.01),
		// 					"tdate_cpgfijexo"		: Ax.math.bc.add(mRowAte.tdate_cpgfijexo_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpFjExo = Ax.math.bc.sub(mBcSumCpFjExo, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// } else if (mBcSumCpFjExo < 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpFjExo < 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgfijexo_round"	: Ax.math.bc.sub(mRowAte.tdate_cpgfijexo_round, 0.01),
		// 					"tdate_cpgfijexo"		: Ax.math.bc.sub(mRowAte.tdate_cpgfijexo_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpFjExo = Ax.math.bc.add(mBcSumCpFjExo, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// }

		// if (mBcSumCpVrIgv > 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpVrIgv > 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgvaraf_round"	: Ax.math.bc.add(mRowAte.tdate_cpgvaraf_round, 0.01),
		// 					"tdate_cpgvaraf"		: Ax.math.bc.add(mRowAte.tdate_cpgvaraf_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpVrIgv = Ax.math.bc.sub(mBcSumCpVrIgv, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// } else if (mBcSumCpVrIgv < 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpVrIgv < 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgvaraf_round"	: Ax.math.bc.sub(mRowAte.tdate_cpgvaraf_round, 0.01),
		// 					"tdate_cpgvaraf"		: Ax.math.bc.sub(mRowAte.tdate_cpgvaraf_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpVrIgv = Ax.math.bc.add(mBcSumCpVrIgv, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// }

		// if (mBcSumCpVrExo > 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpVrExo > 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgvarexo_round"	: Ax.math.bc.add(mRowAte.tdate_cpgvarexo_round, 0.01),
		// 					"tdate_cpgvarexo"		: Ax.math.bc.add(mRowAte.tdate_cpgvarexo_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpVrExo = Ax.math.bc.sub(mBcSumCpVrExo, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// } else if (mBcSumCpVrExo < 0.00) {
		// 	mRsAte.forEach((mRowAte) => {
		// 		if (mBcSumCpVrExo < 0.00) {
		// 			Ax.db.update('fas_tedef_date_test',
		// 				{
		// 					"tdate_cpgvarexo_round"	: Ax.math.bc.sub(mRowAte.tdate_cpgvarexo_round, 0.01),
		// 					"tdate_cpgvarexo"		: Ax.math.bc.sub(mRowAte.tdate_cpgvarexo_round, 0.01)
		// 				},
		// 				{
		// 					"tdate_serial"			: mRowAte.tdate_serial
		// 				}
		// 			);
		// 			mBcSumCpVrExo = Ax.math.bc.add(mBcSumCpVrExo, 0.01);
		// 		}
		// 	})
		// 	mRsAte.close();
		// }

        if (mStrMecPago == 'PPS') {
			mStrSqlCond	= "fas_liquidacion_impuesto.liqi_impuesto = '" + mRowData.liql_impuesto + "'"
		} else {
			mStrSqlCond	= '1=1'
		}
		// Recuperado de lineas para insertar en dfac
		let mObjDfac = Ax.db.executeQuery(`
			<select first = '1'>
				<columns>
					fas_tedef_factura.tdf_nrolote,
					fas_financiador.fin_codigo,
					fas_financiador.fin_codigo_aux1,
					fas_admision_aut.aut_codigo_prod,
					fas_admision_aut.aut_tipo,
					fas_admision.adm_fecha,
					fas_empresa.emp_nif,
					fas_centro.cen_refaux1,
					fas_cuenta.cnt_paq_codigo,
					fas_cuenta.cnt_presta_paq,
					nvl(fas_cuenta.cnt_importe_paq, 0.00) cnt_importe_paq,
					fas_factura_venta.fvh_id,
					fas_factura_venta.fvh_numero,
					fas_factura_venta.fvh_fecha_emision,
					fas_factura_venta.fvh_modo_pago,
					fas_factura_venta.fvh_submodo_pago,
					fas_factura_venta.fvh_moneda,
					fas_factura_venta.fvh_impuesto_val,
					fas_factura_venta.fvh_importe_total,
					fas_factura_venta.fvh_indicador,
					fas_factura_venta_tipo.fvt_refaux1,

                    fas_factura_venta.fvh_base_imponible,
                    fas_factura_venta.fvh_impuesto_val,
                    fas_factura_venta.fvh_importe_total
				</columns> 
				<from table = 'fas_tedef_factura'>
					<join table = 'fas_tedef_lote'>
						<on>fas_tedef_factura.tdf_nrolote = fas_tedef_lote.tdl_nrolote</on>
					</join>
					<join table='fas_factura_venta'>
						<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
						<join table='fas_factura_venta_tipo'>
							<on>fas_factura_venta.fvt_codigo_tipo = fas_factura_venta_tipo.fvt_codigo</on>
						</join>
						<join table = 'fas_financiador'>
							<on>fas_factura_venta.fvh_financiador = fas_financiador.fin_codigo</on>
						</join>
						<join table='fas_centro'>
							<on>fas_factura_venta.fvh_centro = fas_centro.cen_codigo</on>
							<join table='fas_empresa'>
								<on>fas_centro.emp_codigo = fas_empresa.emp_codigo</on>
							</join>
						</join>
						<join table='fas_factura_venta_linea'>
							<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
							<join table='fas_factura_venta_enlace' >
								<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
								<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
								<join table='fas_liquidacion'>
									<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
									<join table='fas_cuenta'>
										<on>fas_liquidacion.liq_cnt_id = fas_cuenta.cnt_id</on>
										<join table='fas_admision'>
											<on>fas_cuenta.cnt_episodio = fas_admision.adm_episodio</on>
											<join table='fas_admision_aut'>
												<on>fas_admision.adm_episodio = fas_admision_aut.aut_episodio</on>
											</join>
										</join>
									</join>
									<join table = 'fas_liquidacion_impuesto'>
										<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
									</join>
								</join>
							</join>
						</join>
					</join>
				</from>
				<where>
						fas_tedef_factura.tdf_nrolote = ?
					AND fas_factura_venta.fvh_numero = ?
					AND ${mStrSqlCond}
					AND fas_admision_aut.aut_estado = 'A'
					AND fas_admision_aut.aut_tipo != '99'
                    ${mStrCondFact}
				</where>
				<order>
					fas_admision_aut.aut_tipo ASC
				</order>
				<group>
					1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21, 22,23,24
				</group>
			</select>
		`, mRowData.tdf_nrolote, mRowData.fvh_numero).toOne();

		// Recorrido de los datos recuperados
		try {

			// Declaración de variables para dfac
			let mStrSubModo		= '';
			let mStrCodProd		= '';
			let mDbTotFac		= 0;
			let mDbBaseImp		= 0;
			let mDateFecTemp	= new Ax.util.Date();

			// Recuperación de FECHA Y HORA de la cuenta
			let mDateFecha		= mDateFecTemp.format('dd-MM-yyyy');
			let mDateHora		= mDateFecTemp.format('HH:mm:ss');

            // Verificacion si es Paquete quirúrgico
			if (mObjDfac.cnt_paq_codigo && mObjDfac.cnt_paq_codigo.match('PAQUI.*')) {
				mObjDfac.fvh_modo_pago = 'PAQUI'
			}

            // Si es Paciente mes, la base imponible se obtiene de otra manera
			if (mObjDfac.fvh_modo_pago == 'PACMES') {
				let mObjPaquete = Ax.db.executeQuery(`
					<select>
						<columns>
							tasg_paquete_tar	tarifa_paquete, 
							tasg_paquete		grupo_paquete,
							fas_paquete.paq_prestacion
						</columns>
						<from table='fas_paquete_grupo' >
							<join table='fas_paquete' >
								<on>fas_paquete_grupo.pgr_codigo = fas_paquete.paq_paquete_grupo</on>
							</join>
							<join table='fas_tarifa_asignacion' >
								<on>fas_paquete_grupo.pgr_codigo = fas_tarifa_asignacion.tasg_paquete</on>
								<join table='fas_factura_venta'>
									<on>tasg_financiador	= fvh_financiador</on>
									<on>tasg_plan_cobertura	= fvh_financiador_plan</on>
								</join>
							</join>
						</from>
						<where> 
								fas_paquete.paq_metodo_fac		= 'F'
							AND fas_paquete_grupo.pgr_estado	= 'A'
							AND fas_paquete.paq_estado			= 'A'
							AND fas_factura_venta.fvh_id		= ?
                            ${mStrCondFact}
						</where>
					</select>
				`, mObjDfac.fvh_id).toOne();

				let mObjPrecios = Ax.db.call('obtenerPrecioTarifaPrestacion',
                                    mObjPaquete.tarifa_paquete,
                                    mObjDfac.adm_fecha,
                                    mObjPaquete.paq_prestacion);

                mObjDfac.cnt_importe_paq	= mObjPrecios.precio;
                mObjDfac.fvh_indicador		= "N";
			}


            /**
			 * Si el financiador es Pacífico Seguro y Reaseguro,
			 * el código del producto toma una conversión para que
			 * pase por SUSALUD
			 */
			if (mObjDfac.fin_codigo == '00042950') {
				switch (mObjDfac.aut_codigo_prod) {
					case 'AM05' :
						mObjDfac.aut_codigo_prod = '00001';
						break;

					case 'AM06' :
						mObjDfac.aut_codigo_prod = '00002';
						break;

					case 'AM07' :
						mObjDfac.aut_codigo_prod = '00003';
						break;

					case 'AM08' :
						mObjDfac.aut_codigo_prod = '00004';
						break;

					case 'AM09' :
						mObjDfac.aut_codigo_prod = '00005';
						break;

					case 'AM10' :
						mObjDfac.aut_codigo_prod = '00006';
						break;

					case 'GRAV' :
						mObjDfac.aut_codigo_prod = '00007';
						break;

					case 'AO01' :
						mObjDfac.aut_codigo_prod = '00008';
						break;

					case 'AO03' :
						mObjDfac.aut_codigo_prod = '00009';
						break;

					case 'CANC' :
						mObjDfac.aut_codigo_prod = '00010';
						break;

					case 'CANN' :
						mObjDfac.aut_codigo_prod = '00011';
						break;

					case 'VCAN' :
						mObjDfac.aut_codigo_prod = '00012';
						break;

					case 'VGRA' :
						mObjDfac.aut_codigo_prod = '00013';
						break;

					case 'CANB' :
						mObjDfac.aut_codigo_prod = '00014';
						break;

					case 'FOLA' :
						mObjDfac.aut_codigo_prod = '00015';
						break;

					case 'INDV' :
						mObjDfac.aut_codigo_prod = '00016';
						break;

					case 'MEVI' :
						mObjDfac.aut_codigo_prod = '00017';
						break;

					case 'MINT' :
						mObjDfac.aut_codigo_prod = '00018';
						break;

					case 'MLTP' :
						mObjDfac.aut_codigo_prod = '00019';
						break;

					case 'MLTS' :
						mObjDfac.aut_codigo_prod = '00020';
						break;

					case 'MNAC' :
						mObjDfac.aut_codigo_prod = '00021';
						break;

					case 'MPLN' :
						mObjDfac.aut_codigo_prod = '00022';
						break;

					case 'MSLD' :
						mObjDfac.aut_codigo_prod = '00023';
						break;

					case 'MULM' :
						mObjDfac.aut_codigo_prod = '00024';
						break;

					case 'SEAU' :
						mObjDfac.aut_codigo_prod = '00025';
						break;

					case 'SECO' :
						mObjDfac.aut_codigo_prod = '00026';
						break;

					case 'VDEN' :
						mObjDfac.aut_codigo_prod = '00027';
						break;

					case 'ADMI' :
						mObjDfac.aut_codigo_prod = '00028';
						break;

					case 'ACCI' :
						mObjDfac.aut_codigo_prod = '00029';
						break;

					case 'ACCO' :
						mObjDfac.aut_codigo_prod = '00031';
						break;

					case 'ACES' :
						mObjDfac.aut_codigo_prod = '00030';
						break;

					case 'MLTV' :
						mObjDfac.aut_codigo_prod = '00032';
						break;

					case 'AE08' :
						mObjDfac.aut_codigo_prod = '00033';
						break;

					case 'AE09' :
						mObjDfac.aut_codigo_prod = '00034';
						break;

					case 'AE10' :
						mObjDfac.aut_codigo_prod = '00035';
						break;

					case 'AE11' :
						mObjDfac.aut_codigo_prod = '00036';
						break;
				}
			}

            /**
			 * Si el financiador es Pacífico EPS, el código del producto 
			 * toma el valor 99999
			 */
			if (mObjDfac.fin_codigo == '00043392') {
				mObjDfac.aut_codigo_prod = '99999'
			}

            /**
			 * Si el submodo de pago es null, se guarda 999 como valor por defecto, de ser
			 * paciente mes o paquete quirúrgico, toma el valor de '02' o '03'
			 */
			switch (mObjDfac.fin_codigo) {

				// RIMAC SEGUROS Y REASEGUROS
				case '00041343'	:
					if (mObjDfac.fvh_modo_pago == 'PACMES') {
						mStrSubModo = '011';
					} else if (mObjDfac.fvh_modo_pago == 'PAQUI') {
						mStrSubModo = '03'
					} else {
						mStrSubModo = mObjDfac.fvh_submodo_pago;
					}
					break;

				// RIMAC S.A. ENTIDAD PRESTADORA DE SALUD
				case '00043258'	:
					if (mObjDfac.fvh_modo_pago == 'PACMES') {
						mStrSubModo = '011';
					}else if (mObjDfac.fvh_modo_pago == 'PAQUI') {
						mStrSubModo = '03'
					}else{
						mStrSubModo = mObjDfac.fvh_submodo_pago;
					}
					break;
				default	:
					mStrSubModo = mObjDfac.fvh_submodo_pago;
			}

            /**
			 * Si es paquete quirúrgico, el sub mecanismo de pago tendran un valor dependiendo
			 * del paquete informado.
			 */
			switch (mObjDfac.cnt_presta_paq) {
				case '998810' :
					mStrSubModo = '061';
					break;

				case '998811' :
					mStrSubModo = '233';
					break;

				case '998812' :
					mStrSubModo = '012';
					break;

				case '998813' :
					mStrSubModo = '074';
					break;

				case '998814' :
					mStrSubModo = '132';
					break;

				case '998815' :
					mStrSubModo = '137';
					break;
			}

            /**
			 * Si el sub mecanismo de pago es nulo, esta vacío o es llenado con un blanco,
			 * toma el siguiente valor por defecto "999"
			 */
			if (mStrSubModo == null || mStrSubModo == '' || mStrSubModo == ' ') {
				mStrSubModo = '999'
			}

            /**
			 * Si el financiador es Pacífico Seguro y reaseguro, Pacífico EPS, Rimac Seguro y reaseguro,
			 * Rimac EPS o Sánitas EPS, mantienen el producto informado, caso contrario tomará el valor 99999
			 */
			if (['00041343', '00043258', '00042950', '00043392', '00059951'].includes(mObjDfac.fin_codigo)) {
				mStrCodProd = mObjDfac.aut_codigo_prod
			} else {
				mStrCodProd = '99999';
			}

            /**
			 * Verificación si es una nota de crédito
			 * o una factura
			 */
			let mChrTipoNota;
			if (mObjDfac.codigo_tipo != 'S') {
				mChrTipoNota = 'N'
			}

            

			// Inserción en fas_tedef_dfac_test 
			Ax.db.insert('fas_tedef_dfac_test',
				{
					"tdfac_fecha"			: mDateFecha,
					"tdfac_hora"			: mDateHora,

					"tdfac_lote"			: mObjDfac.tdf_nrolote,
					"tdfac_iafas"			: mObjDfac.fin_codigo_aux1,
					"tdfac_rucemp"			: mObjDfac.emp_nif,
					"tdfac_ipress"			: mObjDfac.cen_refaux1,
					"tdfac_tipodocpg"		: mObjDfac.fvt_refaux1,
					"tdfac_nrodocpg"		: mObjDfac.fvh_numero,
					"tdfac_centro"			: mStrCentro,
					"tdfac_fecfac"			: mObjDfac.fvh_fecha_emision,
					"tdfac_prod"			: mStrCodProd,
					"tdfac_cntpres"			: 0, // mIntCntAte,
					"tdfac_mecpag"			: mObjDfac.fvh_modo_pago,
					"tdfac_submecpag"		: mStrSubModo,
					"tdfac_mntprepac"		: mObjDfac.cnt_importe_paq,
					"tdfac_fecprepac"		: mObjDfac.cnt_fecha,
					"tdfac_tipmon"			: mObjDfac.fvh_moneda,
					"tdfac_mntexo"			: 0, // mObjDate.tdate_prdsemedexo,
					"tdfac_totcofjaf"		: 0, // mObjDate.tdate_cpgfijaf,
					"tdfac_totcofjaf_round"	: 0, // Ax.math.bc.of(mObjDate.tdate_cpgfijaf).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_totcofjex"		: 0, // mObjDate.tdate_cpgfijexo,
					"tdfac_totcofjex_round"	: 0, // Ax.math.bc.of(mObjDate.tdate_cpgfijexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_totcovaaf"		: 0, // mObjDate.tdate_cpgvaraf,
					"tdfac_totcovaaf_round"	: 0, // Ax.math.bc.of(mObjDate.tdate_cpgvaraf).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_totcovaex"		: 0, // mObjDate.tdate_cpgvarexo,
					"tdfac_totcovaex_round"	: 0, // Ax.math.bc.of(mObjDate.tdate_cpgvarexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_baseimp"			: Ax.math.bc.of(mObjDfac.fvh_base_imponible).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_montofact"		: Ax.math.bc.of(mObjDfac.fvh_impuesto_val).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_totfact"			: Ax.math.bc.of(mObjDfac.fvh_importe_total).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
					"tdfac_tipnota"			: mChrTipoNota,
					"tdfac_nronota"			: '',
					"tdfac_mntnota"			: '',
					"tdfac_fecnota"			: '',
					"tdfac_mtvnota"			: '',
					"tdfac_fecenv"			: '',
					"tdfac_indglob"			: mObjIndFactGlob[mObjDfac.fvh_numero] || 'N'		// mObjDfac.fvh_indicador (Indicador temporal)
				}
			);
            
		} catch(e) {
            console.error('DFAC:', e)
			/**
			 * Almacenamiento de las facturas que tienen algún error al updaterar
			 */
			mStrFacturas = mStrFacturas + mObjDfac.fvh_numero + " "
			contador ++;
		}

	});
	mRsDatosDfacFichero.close();


    /*****************************************************************************************/
    /********************* FARMACIA ******** SERVICIO ******** ATENCIÓN **********************/
    /*****************************************************************************************/
    
    /**
     * Si es diferente a PPS, se tomará en cuenta el impuesto, de lo contrario,
     * no se incluirá en la búsqueda de data
     */
    if (mStrMecPago == 'PPS') {
        mStrSqlCol		= 'fvh_numero, liql_impuesto,';
        mStrSqlOrden	= '<order>fvh_numero, fas_liquidacion.liq_id, liql_impuesto DESC</order>';
    } else {
        mStrSqlCol		= 'fvh_numero,'
        mStrSqlOrden	= '<order>fvh_numero, fas_liquidacion.liq_id</order>';
    }

    /**
     * Información del financiador
    */
    let mObjFinanciador = Ax.db.executeQuery(`
            <select>
                <columns>
                    fin_codigo,
                    fin_global_ind
                </columns>
                <from table = 'fas_financiador' />
                <where>
                    fin_codigo = ?
                </where>
            </select>
        `, pdata.tdl_financiador).toOne();

	/**
	 * Lista de financiadores para evitar cobertura diferenciada:
	 * - 00056297, ONCOSALUD S.A.C
	 * - 00058743, FONDO PARA ENFERMEDADES,SEGUROS,PENSIONES DE EMPLEADOS BCRP
	 * - 00057437, PETROLEOS DEL PERU - PETROPERU S.A.
	 * - 00057581, SISTEMAS ALTERNATIVOS DE BENEFICIOS S.A.
	 * - 00042319, COLEGIO MEDICO DEL PERU
	 * - 00041463, SERVICIO DE AGUA POTABLE ALCANTARILLADO DE LIMA - SEDAPAL
	*/
	let arr = ['00056297', '00058743', '00057437', '00057581', '00042319','00041463'];

	/**
	 * Lista de financiadores que aplica cobertura diferenciada:
	 * - 00043392, PACIFICO S.A. ENTIDAD PRESTADORA DE SALUD
	 * - 00043258, RIMAC S.A. ENTIDAD PRESTADORA DE SALUD
	 * - 00044688, MAPFRE PERU S.A. ENTIDAD PRESTADORA DE SALUD
	 * - 00061538, LA POSITIVA S.A. ENTIDAD PRESTADORA DE SALUD
	 * - 00059951, SANITAS PERU S.A. - EPS
	*/
	let arr_2 = ['00043392','00043258','00044688','00061538','00059951'];

	let mIndFinanciador = 0;
	if (arr.includes(pdata.tdl_financiador)) mIndFinanciador = 1

    /**
     * Primera select para identificar las facturas y liquidaciones a recorrer
     * de esta manera se contemplan a las facturas globales
     */
    let mRsInicial = Ax.db.executeQuery(`
        <select>
            <columns>
                DISTINCT
                tdf_nrolote,
                ${mStrSqlCol}
                fas_liquidacion.liq_id,
                fas_liquidacion.liq_cnt_id,
                liq_episodio,
                fas_ambito_grupo.amg_codigo,
                adm_episodio_padre,
                adm_episodio
            </columns>
            <from table = 'fas_tedef_factura'>
                <join table = 'fas_factura_venta'>
                    <on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
                    <join table = 'fas_factura_venta_enlace'>
                        <on>fas_factura_venta.fvh_id = fas_factura_venta_enlace.fvh_id</on>
                        <join table = 'fas_liquidacion'>
                            <on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
                            <join table = 'fas_liquidacion_linea'>
                                <on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
                                <on>fas_factura_venta_enlace.liql_id = fas_liquidacion_linea.liql_id</on>
                            </join>
                            <join table = 'fas_admision'>
                                <on>fas_liquidacion.liq_episodio = fas_admision.adm_episodio</on>
                                <join table='fas_ambito'>
                                    <on>fas_admision.adm_ambito = fas_ambito.amb_codigo</on>
                                    <join table='fas_ambito_grupo'>
                                        <on>fas_ambito.amb_grupo_cod = fas_ambito_grupo.amg_codigo</on>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </join>
                </join>
            </from>
            <where>
                    tdf_nrolote	= ?
                AND tdf_centro	= ?
                AND liql_estado in ('P', 'F')
                ${mStrCondFact}
            </where>
            ${mStrSqlOrden}
        </select>
    `, mStrLote, mStrCentro).toMemory();

    // Recorrido Inicial por lote
	mRsInicial.forEach((mRowData) => {

        /**
         * Reinicio de variables por cambio de factura:
         *  - aux_num_fact: Número de factura.
         *  - aux_num_carta: Número de carta de garantia.
         *  - mStrIndGlobal: Indicador de factura Individual[N]/Global[S].
         *  - mObjIndFactGlob: Captura de numero factura e indicador.
         */
        if(aux_num_fact != mRowData.fvh_numero){
            aux_num_fact = mRowData.fvh_numero;
            aux_num_carta = '';
            mStrIndGlobal = 'N';
            mObjIndFactGlob[aux_num_fact] = mStrIndGlobal;
        }

        // Respaldo del episodio padre en una variable auxiliar
        aux_episodio_padre = mRowData.adm_episodio_padre

        let coberturaAutOrigen = Ax.db.executeQuery(`
            <select>
                <columns>
                    LIMIT 1 cob_ori.aut_cobertura, cob_ori.aut_codigo_prod
                </columns>
                <from alias='cob_ori'>
                    <union>
                        <select>
                            <columns>
                                DISTINCT fas_admision_aut.aut_cobertura, fas_admision_aut.aut_codigo_prod
                            </columns>
                            <from table='fas_actividad_pres'>
                                <join table='fas_cuenta'>
                                    <on>fas_cuenta.cnt_id=fas_actividad_pres.acp_cuenta_id</on>
                                </join>
                                <join table='fas_actividad_pres' alias='fas_actividad_pres_ori'>
                                    <on>fas_actividad_pres_ori.acp_id=fas_actividad_pres.acp_id_ori</on>
                                    <join table='fas_admision_aut'>
                                        <on>fas_actividad_pres_ori.acp_aut_id = fas_admision_aut.aut_id</on>
                                    </join>
                                </join>
                            </from>
                            <where>
                                fas_actividad_pres.acp_episodio = ? AND
                                fas_actividad_pres.acp_estado IN ('V', 'P') AND
                                fas_cuenta.cnt_estado = 'V'
                            </where>
                        </select>
                        <select>
                            <columns>
                                DISTINCT fas_admision_aut.aut_cobertura, fas_admision_aut.aut_codigo_prod
                            </columns>
                            <from table='fas_actividad_prod'>
                                <join table='fas_cuenta'>
                                    <on>fas_cuenta.cnt_id=fas_actividad_prod.acd_cuenta_id</on>
                                </join>
                                <join table='fas_actividad_prod' alias='fas_actividad_prod_ori'>
                                    <on>fas_actividad_prod_ori.acd_id=fas_actividad_prod.acd_id_ori</on>
                                    <join table='fas_admision_aut'>
                                        <on>fas_actividad_prod_ori.acd_autoriza = fas_admision_aut.aut_id</on>
                                    </join>
                                </join>
                            </from>
                            <where>
                                fas_actividad_prod.acd_episodio = ? AND
                                fas_actividad_prod.acd_estado IN ('V', 'P') AND
                                fas_cuenta.cnt_estado = 'V'
                            </where>
                        </select>
                    </union>
                </from>
            </select>
        `, mRowData.adm_episodio, mRowData.adm_episodio).toOne();

        /**
         * CASO 0:
         * Restriccion de cobertura diferenciada por financiador.
        */
        if(mIndFinanciador == 1){
            mRowData.adm_episodio_padre = null
        }
		/**
         * CASO 1:
         * Aplica cobertura diferenciada para lista de financiadores
        */
        else if(arr_2.includes(pdata.tdl_financiador)){
            mIndFinanciador = 0;
            mRowData.adm_episodio_padre = aux_episodio_padre;
        }
        /**
         * CASO 2:
         * - PACIFICO COMPAÑIA DE SEGUROS Y REASEGUROS [00042950]
         * Aplica cobertura diferenciada si:
         *      - Cobertura         : 6101 ó 6100
         *      - Código Producto   : SECO
         */
        else if(pdata.tdl_financiador == '00042950' && (['6101','6100'].includes(coberturaAutOrigen.aut_cobertura)) && coberturaAutOrigen.aut_codigo_prod == 'SECO'){
            mIndFinanciador = 0;
            mRowData.adm_episodio_padre = aux_episodio_padre;
        }

        /**
         * CASO 3:
         *  - PLANSALUD CLINICA RICARDO PALMA [00061540]
         * Aplica cobertura diferenciada si:
         *      - Cobertura         : 6101
         */    
        else if(pdata.tdl_financiador == '00061540' && coberturaAutOrigen.aut_cobertura == '6101'){
            mIndFinanciador = 0;
            mRowData.adm_episodio_padre = aux_episodio_padre;
        } else{

            /**
             * Por defecto no aplica cobertura diferenciada
            */
            mIndFinanciador = 1;
            mRowData.adm_episodio_padre = null
        }

        /**
		 * Condición SQL médico, depende del ámbito. Si es Consulta Externa[C] jamas se informa el medico tratante,
		 * por ende se toma el médico de ingreso como médico responsable, mientra que para el resto de
		 * ámbitos se toma al médico tratante informados en la admision (fas_admision)
		 */
		let mSqlMedico;
		if (mRowData.amg_codigo == 'C') {
			mSqlMedico = 'adm_medico_ingreso'
		} else {
			mSqlMedico = 'adm_medico_tratante'	
		}

        // Definición de la condición segun mecanismo de pago para la select
		if (mStrMecPago == 'PPS') {
			mStrSqlCond	= "fas_liquidacion_linea.liql_impuesto = '" + mRowData.liql_impuesto + "'"
		} else {
			mStrSqlCond	= '1=1'
		}

        /*****************************************************************************************/
        /*************************************** FARMACIA ****************************************/
        /*****************************************************************************************/

        // Obtención de data a insertar en dfarm
		let mRsDatosDfarm = Ax.db.executeQuery(`
			<select>
				<columns>
					DISTINCT
					fas_tedef_factura.tdf_nrolote,
					fas_empresa.emp_nif,
					fas_centro.cen_refaux1,
					fas_factura_venta.fvt_codigo_tipo,
					fas_factura_venta.fvh_numero,
					fas_producto.prd_tipo_susalud,
					fas_producto.prd_cod_gtin,
					fas_producto.prd_cod_unspsc,
					fas_actividad_prod.acd_fecha,
					fas_liquidacion_linea.liql_id,
					fas_liquidacion_linea.liql_cantidad,
					fas_liquidacion_linea.liql_ambito,
					fas_liquidacion_linea.liql_descuento,
					fas_liquidacion_linea.liql_impuesto,
					CAST(fas_liquidacion_linea.liql_precio_fac as numeric(12,2)) liql_precio_fac,
					CAST(fas_liquidacion_linea.liql_importe_neto_coa as numeric(12,2)) liql_importe_neto_coa,
					CAST(fas_liquidacion_linea.liql_importe_neto as numeric(12,2)) liql_importe_neto,
					fas_producto.prd_codigo,
					fas_producto.prd_unidad,
					fas_liquidacion_linea.liql_cubierto,
					fas_admision.adm_episodio,
					CASE WHEN liql_cubierto = 0
						THEN 0
						ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
									THEN (liql_importe_neto * liql_cantidad) * (1 - liql_factor_coa / 100)
									ELSE liql_importe_neto - <nvl>liql_importe_neto_coa,0</nvl>
								END
					END liql_importe_neto_coa_pp,
					CASE WHEN acd_origen_app = 'CRPi emergencia'
						THEN 2
						ELSE 1
					END farm_correlativo
				</columns> 
					<from table = 'fas_tedef_factura'>
						<join table='fas_factura_venta'>
							<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
							<join table='fas_centro'>
								<on>fas_factura_venta.fvh_centro = fas_centro.cen_codigo</on>
								<join table='fas_empresa'>
									<on>fas_centro.emp_codigo = fas_empresa.emp_codigo</on>
								</join>
							</join>
							<join table='fas_factura_venta_linea'>
								<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
								<join table='fas_factura_venta_enlace' >
									<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
									<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
									<join table = 'fas_liquidacion'>
										<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
										<join table='fas_liquidacion_linea'>
											<on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
											<join table='fas_actividad_prod'>
												<on>fas_liquidacion_linea.acd_id = fas_actividad_prod.acd_id</on>
												<join table='fas_producto'>
													<on>fas_actividad_prod.acd_producto = fas_producto.prd_codigo</on>
												</join>
											</join>
										</join>
										<join table='fas_cuenta'>
											<on>fas_liquidacion.liq_cnt_id = fas_cuenta.cnt_id</on>
											<join table='fas_admision'>
												<on>fas_cuenta.cnt_episodio = fas_admision.adm_episodio</on>
											</join>
										</join>
									</join>
								</join>
							</join>
						</join>
					</from>
				<where>
						fas_tedef_factura.tdf_nrolote = ?
					AND fas_factura_venta.fvh_numero = ?
					AND ${mStrSqlCond}
					AND fas_liquidacion.liq_id = ?
					AND fas_liquidacion_linea.liql_importe_neto > 0
					AND fas_liquidacion_linea.liql_estado IN ('P', 'F', 'Q')
                    ${mStrCondFact}
				</where>
				<order>
					farm_correlativo
				</order>
			</select>
		`, mRowData.tdf_nrolote, mRowData.fvh_numero, mRowData.liq_id).toMemory();

        // Declaración de variables para dfarm
		let mIntSecu_farm = 0;

        // Se almacena el ID de la liquidación y la factura por primera vez
		if (mStrLiq_farm == '') {
			mStrLiq_farm = mRowData.liq_id;
			mCountFichFarm = 1
		}
		if (mStrFactDfarm == '') {
			mStrFactDfarm = mRowData.fvh_numero;
			mCountFichFarm = 1
		}

        /**
		 * Verificación del cambio de ID de liquidación y factura, se reasignan los valores.
		 * Si el cambio es por liquidación, el contador aumentará.
		 * Si el cambio es por factura, se reiniciará el contador a 1
		 */ 
		if (mStrLiq_farm != mRowData.liq_id) {
			mStrLiq_farm = mRowData.liq_id;
			mCountFichFarm ++;
		}
		if (mStrFactDfarm != mRowData.fvh_numero) {
			mStrFactDfarm	= mRowData.fvh_numero;
			mCountFichFarm	= 1;
		}

        let mIndFarm = 0;
		// Recorrido de las lineas
		mRsDatosDfarm.forEach((mrow) => {
            try{

                if(mIndFinanciador == 1){
                    mrow.farm_correlativo = 1;
                }
                /**
				  * Para correlativo de farmacia 2, incrementa el contador 
				  * y se reinicia el secundario solo la primera vez.
				 */
				if(mrow.farm_correlativo == 2 && mIndFarm == 0){
                    mCountFichFarm ++;
                    mIndFarm = 1
                    mIntSecu_farm = 0
                }
                /**
				 * Protección si llega cantidad 0 en los productos
				 * para obtener los montos unitarios
				 */
				if (mrow.liql_cantidad == 0.00) {
					mrow.liql_cantidad = 1.00;
				}

                // Cálculo del monto unitario Precio * Cantidad
				let mDbMontoUnit = Ax.math.bc.div(mrow.liql_importe_neto, mrow.liql_cantidad);

                // Obtención del Importe Coa (copago variable)
				let mDbImpCoa = !mrow.liql_importe_neto_coa_pp ? 0.00 : mrow.liql_importe_neto_coa_pp

                /**
				 * Asignación del monto 0.00 cuando el
				 * importe neto coa esta vacío o nulo
				 */
				if (mrow.liql_importe_neto_coa == null || mrow.liql_importe_neto_coa == '') {
					mrow.liql_importe_neto_coa = '0.00'
				}

                /**
				 * Variables por defecto para el catálogo y código:
				 * Si el tipo es "M" el Nro de catálogo será "1" y el
				 * código a usar será el GTIN.
				 * Si el tipo es ("P", "I", "B", "A") 
				 * el Nro de catálogo será "1" O "2" dependiendo que campo
				 * esta informado (GTIN o UNSPSC) respectivamente.
				 * Si el tipo es ("R", "O") el Nro de catálogo será "9" y
				 * el código a usar será "XXXXXXXXXXXXX" por defecto
				 */
				let mStrCatalogo	= '';
				let mStrCodigo		= '';
				if (mrow.prd_tipo_susalud == "M") {
					mStrCatalogo	= '1';
					mStrCodigo		= mrow.prd_cod_gtin;
				} else if (mrow.prd_tipo_susalud == "P" || mrow.prd_tipo_susalud == "I" ||
					mrow.prd_tipo_susalud == "B" || mrow.prd_tipo_susalud == "A") {
					if (mrow.prd_cod_unspsc) {
						mStrCatalogo	= '2';
						mStrCodigo		= mrow.prd_cod_unspsc;
					} else {
						mStrCatalogo	= '1';
						mStrCodigo		= mrow.prd_cod_gtin;
					}
				} else if (mrow.prd_tipo_susalud == "R" || mrow.prd_tipo_susalud == "O") {
					mStrCatalogo	= '9';
					mStrCodigo		= 'XXXXXXXXXXXXX'
				}
                
                // Busqueda del diagnóstico principal
				let mStrDiagfarm = Ax.db.executeGet(`
					<select first = '1'>
						<columns>
							adg_diagnostico
						</columns>
						<from table = 'fas_admision_diag' />
						<where>
								adg_episodio	= ?
							AND adg_diagnostico	!= ""
							AND adg_principal	= 1
						</where>
						<order>
							date_created DESC
						</order>
					</select>
				`, mrow.adm_episodio);

                /**
				 * Si el diagnóstico llega mal informado (3 caracteres), se le aumentará ".X" como protección
				 * para que no salten errores al momento de pasar por SUSALUD
				 */
				if (mStrDiagfarm.length == '3') {
					mStrDiagfarm = mStrDiagfarm + ".X"
				}

                /**
				 * Verificación si es monto cubierto o no cubierto
				 * y asignación de los valores correspondientes en
				 * base al importe neto obtenido de la liquidación
				 */
				let mIntNCub	= 0.00;
				let mIntCub		= 0.00;
					mIntCub		= Ax.math.bc.mul(mDbMontoUnit, mrow.liql_cantidad);
				if (mrow.liql_cubierto == 0) {
					mIntNCub	= mrow.liql_importe_neto;
				}

                // Adición del contador de Nro de productos por liquidación
				mIntSecu_farm ++

                // Inserción en la tabla Dfarm
				Ax.db.insert('fas_tedef_dfarm_test',
					{
						"tdfarm_nrolote"		: mrow.tdf_nrolote,
						"tdfarm_ruc"			: mrow.emp_nif,
						"tdfarm_ipress"			: mrow.cen_refaux1,
						"tdfarm_tipodocpg"		: mrow.fvt_codigo_tipo,
						"tdfarm_nrodocpg"		: mrow.fvh_numero,
						"tdfarm_centro"			: mStrCentro,
						"tdfarm_pres"			: mCountFichFarm,
						"prd_codigo"			: mrow.prd_codigo,
						"tdfarm_corprd"			: mIntSecu_farm,
						"tdfarm_tipoprod"		: mrow.prd_tipo_susalud,
						"tdfarm_catalogo"		: mStrCatalogo,
						"tdfarm_codprod"		: mStrCodigo,
						"tdfarm_fecdisfarm"		: mrow.acd_fecha,
						"tdfarm_mntvntprod"		: mrow.liql_cantidad,
						"tdfarm_tipunddisp"		: mrow.prd_unidad,
						"tdfarm_mntuntsimp"		: mDbMontoUnit,
						"tdfarm_mntunt_round"	: Ax.math.bc.of(mDbMontoUnit).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdfarm_cpgprdfarm"		: mDbImpCoa,
						"tdfarm_cpgprd_round"	: Ax.math.bc.of(mDbImpCoa).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdfarm_mntprdfarm"		: mIntCub,
						"tdfarm_mntprd_round"	: Ax.math.bc.of(mIntCub).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdfarm_mntncubprd"		: mIntNCub,
						"tdfarm_mntncub_round"	: Ax.math.bc.of(mIntNCub).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdfarm_diagprdfar"		: mStrDiagfarm,
						"tdfarm_prdexeifv"		: mrow.liql_impuesto,
						//Código por defecto en guía de farmacia
						"tdfarm_guiafarm"		: "XXXXXXXXXXXX",
						"tdfarm_liql_id"		: mrow.liql_id
					}
				);

            } catch(e) {
				console.error('DFARM:', e)
				/**
				 * Almacenamiento de las facturas que tienen algún error
				 */
				mStrFacturas = mStrFacturas + mrow.fvh_numero + " ";
				contador ++;

			}
        })

        mRsDatosDfarm.close();

        /**
         * Ajustamos los montos de dfarm informados, redondeandolo a 2 decimales para
         * que pasen las tramas
         */
        let mObjDfarmRound = Ax.db.executeQuery(`
            <select>
                <columns>
                    NVL(ROUND(SUM(tdfarm_mntuntsimp), 2), 0.00)	tdfarm_mntuntsimp,
                    NVL(SUM(tdfarm_mntunt_round), 0.00)			tdfarm_mntunt_round,
                    NVL(ROUND(SUM(tdfarm_cpgprdfarm), 2), 0.00)	tdfarm_cpgprdfarm,
                    NVL(SUM(tdfarm_cpgprd_round), 0.00)			tdfarm_cpgprd_round,
                    NVL(ROUND(SUM(tdfarm_mntprdfarm), 2), 0.00)	tdfarm_mntprdfarm,
                    NVL(SUM(tdfarm_mntprd_round), 0.00)			tdfarm_mntprd_round,
                    NVL(ROUND(SUM(tdfarm_mntncubprd), 2), 0.00)	tdfarm_mntncubprd,
                    NVL(SUM(tdfarm_mntncub_round), 0.00)		tdfarm_mntncub_round
                </columns>
                <from table = 'fas_tedef_dfarm_test' />
                <where>
                        tdfarm_nrolote	= ?
                    AND tdfarm_nrodocpg	= ?
                    AND tdfarm_centro	= ?
                </where>
            </select>
        `, mStrLote, mRowData.fvh_numero, mStrCentro).toOne();

        // Declaración de variables a usar para las verificaciones
		let mBcDifMntUnitFarm	= 0.00;
		let mBcDifCpFarm		= 0.00;
		let mBcDifMntCubFarm	= 0.00;
		let mBcDifMntNCubFarm	= 0.00;
		let mRsFarmRound		= Ax.db.executeQuery(`
			<select>
				<columns>
					tdfarm_serial,
					tdfarm_mntunt_round,
					tdfarm_cpgprd_round,
					tdfarm_mntprd_round,
					tdfarm_mntncub_round
				</columns>
				<from table = 'fas_tedef_dfarm_test' />
				<where>
						tdfarm_nrolote	= ?
					AND tdfarm_nrodocpg	= ?
					AND tdfarm_centro	= ?
				</where>
			</select>
		`, mStrLote, mRowData.fvh_numero, mStrCentro).toMemory();

        if (mRsFarmRound.getRowCount() != 0) {
			// Verificación si hay diferencia entre los montos de farm originales y los redondeados
			if (mObjDfarmRound.tdfarm_mntuntsimp.compareTo(mObjDfarmRound.tdfarm_mntunt_round) != 0) {
				mBcDifMntUnitFarm	= Ax.math.bc.sub(mObjDfarmRound.tdfarm_mntuntsimp, mObjDfarmRound.tdfarm_mntunt_round)
			}

			if (mObjDfarmRound.tdfarm_cpgprdfarm.compareTo(mObjDfarmRound.tdfarm_cpgprd_round) != 0) {
				mBcDifCpFarm		= Ax.math.bc.sub(mObjDfarmRound.tdfarm_cpgprdfarm, mObjDfarmRound.tdfarm_cpgprd_round)
			}

			if (mObjDfarmRound.tdfarm_mntprdfarm.compareTo(mObjDfarmRound.tdfarm_mntprd_round) != 0) {
				mBcDifMntCubFarm	= Ax.math.bc.sub(mObjDfarmRound.tdfarm_mntprdfarm, mObjDfarmRound.tdfarm_mntprd_round)
			}

			if (mObjDfarmRound.tdfarm_mntncubprd.compareTo(mObjDfarmRound.tdfarm_mntncub_round) != 0) {
				mBcDifMntNCubFarm	= Ax.math.bc.sub(mObjDfarmRound.tdfarm_mntncubprd, mObjDfarmRound.tdfarm_mntncub_round)
			}

			// Inicio del recorrido de los montos redondeados
			mRsFarmRound.forEach((mRowFarmRound) => {
				// Verificación del monto unitario
				if (mBcDifMntUnitFarm < 0.00) {
					if (mRowFarmRound.tdfarm_mntunt_round > 0.00) {
						mRowFarmRound.tdfarm_mntunt_round = Ax.math.bc.sub(mRowFarmRound.tdfarm_mntunt_round, 0.01);
						mBcDifMntUnitFarm = Ax.math.bc.add(mBcDifMntUnitFarm, 0.01);
						if (mBcDifMntUnitFarm > 0.00) {
							mBcDifMntUnitFarm = 0.00
						}
					}
				} else if (mBcDifMntUnitFarm > 0.00) {
					if (mRowFarmRound.tdfarm_mntunt_round > 0.00) {
						mRowFarmRound.tdfarm_mntunt_round = Ax.math.bc.add(mRowFarmRound.tdfarm_mntunt_round, 0.01)
						mBcDifMntUnitFarm = Ax.math.bc.sub(mBcDifMntUnitFarm, 0.01)
						if (mBcDifMntUnitFarm < 0.00) {
							mBcDifMntUnitFarm = 0.00
						}
					}
				}

				// Verificación del copago
				if (mBcDifCpFarm < 0.00) {
					if (mRowFarmRound.tdfarm_cpgprd_round > 0.00) {
						mRowFarmRound.tdfarm_cpgprd_round = Ax.math.bc.sub(mRowFarmRound.tdfarm_cpgprd_round, 0.01);
						mBcDifCpFarm = Ax.math.bc.add(mBcDifCpFarm, 0.01);
						if (mBcDifCpFarm > 0.00) {
							mBcDifCpFarm = 0.00
						}
					}
				} else if (mBcDifCpFarm > 0.00) {
					if (mRowFarmRound.tdfarm_cpgprd_round > 0.00) {
						mRowFarmRound.tdfarm_cpgprd_round = Ax.math.bc.add(mRowFarmRound.tdfarm_cpgprd_round, 0.01)
						mBcDifCpFarm = Ax.math.bc.sub(mBcDifCpFarm, 0.01)
						if (mBcDifCpFarm < 0.00) {
							mBcDifCpFarm = 0.00
						}
					}
				}

				// Verificación del monto total
				if (mBcDifMntCubFarm < 0.00) {
					if (mRowFarmRound.tdfarm_mntprd_round > 0.00) {
						mRowFarmRound.tdfarm_mntprd_round = Ax.math.bc.sub(mRowFarmRound.tdfarm_mntprd_round, 0.01);
						mBcDifMntCubFarm = Ax.math.bc.add(mBcDifMntCubFarm, 0.01);
						if (mBcDifMntCubFarm > 0.00) {
							mBcDifMntCubFarm = 0.00
						}
					}
				} else if (mBcDifMntCubFarm > 0.00) {
					if (mRowFarmRound.tdfarm_mntprd_round > 0.00) {
						mRowFarmRound.tdfarm_mntprd_round = Ax.math.bc.add(mRowFarmRound.tdfarm_mntprd_round, 0.01)
						mBcDifMntCubFarm = Ax.math.bc.sub(mBcDifMntCubFarm, 0.01)
						if (mBcDifMntCubFarm < 0.00) {
							mBcDifMntCubFarm = 0.00
						}
					}
				}

				// Verificacióon del monto no cubierto
				if (mBcDifMntNCubFarm < 0.00) {
					if (mRowFarmRound.tdfarm_mntncub_round > 0.00) {
						mRowFarmRound.tdfarm_mntncub_round = Ax.math.bc.sub(mRowFarmRound.tdfarm_mntncub_round, 0.01);
						mBcDifMntNCubFarm = Ax.math.bc.add(mBcDifMntNCubFarm, 0.01);
						if (mBcDifMntNCubFarm > 0.00) {
							mBcDifMntNCubFarm = 0.00
						}
					}
				} else if (mBcDifMntNCubFarm > 0.00) {
					if (mRowFarmRound.tdfarm_mntncub_round > 0.00) {
						mRowFarmRound.tdfarm_mntncub_round = Ax.math.bc.add(mRowFarmRound.tdfarm_mntncub_round, 0.01)
						mBcDifMntNCubFarm = Ax.math.bc.sub(mBcDifMntNCubFarm, 0.01)
						if (mBcDifMntNCubFarm < 0.00) {
							mBcDifMntNCubFarm = 0.00
						}
					}
				}

				// Actualización de los montos de dfarm
				Ax.db.update('fas_tedef_dfarm_test',
					{
						"tdfarm_mntunt_round"	: mRowFarmRound.tdfarm_mntunt_round,
						"tdfarm_cpgprd_round"	: mRowFarmRound.tdfarm_cpgprd_round,
						"tdfarm_mntprd_round"	: mRowFarmRound.tdfarm_mntprd_round,
						"tdfarm_mntncub_round"	: mRowFarmRound.tdfarm_mntncub_round
					},
					{
						"tdfarm_serial"			: mRowFarmRound.tdfarm_serial
					}
				);
			})
			mRsFarmRound.close()
		}

        /*****************************************************************************************/
        /*************************************** SERVICIO ****************************************/
        /*****************************************************************************************/

        // Recuperado de data para insertar en dserv
		let mRsDatosDServ = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_tedef_factura.tdf_nrolote,
					fas_empresa.emp_nif,
					fas_centro.cen_refaux1,
					fas_factura_venta.fvt_codigo_tipo,
					fas_factura_venta.fvh_numero,
					fas_liquidacion_linea.liql_presta_fact,
					fas_prestacion.pre_codigo,
					nvl(fas_prestacion.pre_grupo_contable, 6) pre_grupo_contable,
					fas_prestacion.pre_nombre,
					fas_prestacion.pre_cod_rubro,
					fas_medico.med_tipocodigo,
					fas_medico.med_colegiatura,
					fas_medico.med_tipodoc,
					fas_medico.med_documento,
					fas_liquidacion_linea.liq_id,
					fas_liquidacion_linea.liql_id,
					fas_liquidacion_linea.liql_cantidad,
					fas_liquidacion_linea.liql_precio_fac,
					fas_liquidacion_linea.liql_importe_neto_coa,
					nvl(fas_liquidacion_linea.liql_importe_neto_difd, 0.00) liql_importe_neto_difd,
					fas_liquidacion.liq_importe_ded,
					(fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) liql_importe_neto,
					fas_liquidacion_linea.liql_impuesto,
					fas_liquidacion_linea.liql_estado,
					fas_admision.adm_episodio,
					fas_admision.adm_episodio_padre,
					fas_admision.adm_fecha,
					fas_admision.adm_ambito,
					fas_cuenta.date_created,
					fas_concepto_facturable.cfa_codigo,
					fas_concepto_facturable.cfa_tipo_concepto,
					fas_financiador.fin_codigo_aux2,
					fas_actividad_pres.acp_fecha,
					CASE WHEN acp_factor_6 IS NULL
						THEN CASE WHEN acp_factor_1 IS NULL THEN 1
							ELSE acp_factor_1 / 100 END
						ELSE acp_factor_6 /100
							END acp_factor_1,
					CASE WHEN acp_factor_7 IS NULL
						THEN CASE WHEN acp_factor_2 IS NULL THEN 1
							ELSE acp_factor_2 / 100 END
						ELSE acp_factor_7 /100
							END acp_factor_2,
					CASE WHEN acp_factor_8 IS NULL
						THEN CASE WHEN acp_factor_3 IS NULL THEN 1
							ELSE acp_factor_3 / 100 END
						ELSE acp_factor_8 /100
							END acp_factor_3,
					CASE WHEN acp_factor_9 IS NULL
						THEN CASE WHEN acp_factor_4 IS NULL THEN 1
							ELSE acp_factor_4 / 100 END
						ELSE acp_factor_9 /100
							END acp_factor_4,
					CASE WHEN acp_factor_10 IS NULL
						THEN CASE WHEN acp_factor_5 IS NULL THEN 1
							ELSE acp_factor_5 / 100 END
						ELSE acp_factor_10 /100
							END acp_factor_5,
					fas_actividad_pres.acp_cubierto,
					fas_actividad_pres.acp_tipo_funcion,
					fas_actividad_pres.acp_origen_app,
					CASE WHEN acp_origen_app = 'C3 - emergencia'
						THEN 2
						ELSE 1
					END serv_correlativo,
					CASE WHEN liql_cubierto = 0
						THEN 0
						ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
									THEN ((fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) * liql_cantidad) * (1 - liql_factor_coa / 100)
									ELSE (fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) - <nvl>liql_importe_neto_coa,0</nvl>
								END
					END liql_importe_neto_coa_pp,
					CASE WHEN liql_cubierto = 0
						THEN 0
						ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
									THEN liqi_importe_ded * liql_factor_coa / 100
								END
					END liql_importe_coa_fijo
				</columns>
				<from table = 'fas_tedef_factura'>
					<join table='fas_factura_venta'>
						<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
						<join table = 'fas_financiador'>
							<on>fas_factura_venta.fvh_financiador = fas_financiador.fin_codigo</on>
						</join>
						<join table='fas_centro'>
							<on>fas_factura_venta.fvh_centro = fas_centro.cen_codigo</on>
							<join table='fas_empresa'>
								<on>fas_centro.emp_codigo = fas_empresa.emp_codigo</on>
							</join>
						</join>
						<join table='fas_factura_venta_linea'>
							<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
							<join table='fas_factura_venta_enlace' >
								<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
								<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
								<join table = 'fas_liquidacion'>
									<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
									<join table='fas_liquidacion_linea'>
										<on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
										<join table='fas_prestacion'>
											<on>fas_liquidacion_linea.liql_presta_fact = fas_prestacion.pre_codigo</on>
										</join>
										<join table='fas_concepto_facturable'>
											<on>fas_liquidacion_linea.liql_concep_fact = fas_concepto_facturable.cfa_codigo</on>
										</join>
										<join table='fas_actividad_pres'>
											<on>fas_liquidacion_linea.acp_id = fas_actividad_pres.acp_id</on>
											<join type = 'left' table='fas_medico'>
												<on>fas_actividad_pres.acp_medico = fas_medico.med_codigo</on>
											</join>
										</join>
									</join>
									<join table='fas_liquidacion_impuesto'>
										<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
										<on>fas_liquidacion_impuesto.liqi_impuesto = fas_factura_venta_linea.fvl_impuesto</on>
									</join>
									<join table='fas_cuenta'>
										<on>fas_liquidacion.liq_cnt_id = fas_cuenta.cnt_id</on>
										<join table='fas_admision'>
											<on>fas_cuenta.cnt_episodio = fas_admision.adm_episodio</on>
										</join>
									</join>
								</join>
							</join>
						</join>
					</join>
				</from>
				<where>
						fas_tedef_factura.tdf_nrolote = ?
					AND fas_factura_venta.fvh_numero = ?
					AND ${mStrSqlCond}
					AND fas_liquidacion.liq_id = ?
					AND fas_liquidacion_linea.liql_importe_neto > 0
					AND fas_liquidacion_linea.liql_estado IN ('P', 'F', 'Q')
                    ${mStrCondFact}
				</where>
				<group>
					1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44
				</group>
				<order>
					serv_correlativo
				</order>
			</select>
		`, mRowData.tdf_nrolote, mRowData.fvh_numero, mRowData.liq_id).toMemory();
        
        /**
		 * Si tenemos servicios de tipo paquete, se eliminan las lineas con estado "F" (línea del paquete)
		 * y se mantienen las prestaciones que contiene el paquete ('Q')
		 */
		let mArrEst = []
			mRsDatosDServ.rows().groupBy("liql_estado").forEach(e => mArrEst.push(e))
		if (mArrEst.includes('F' && 'Q')) {
			mRsDatosDServ = mRsDatosDServ.rows().select(e => e.getString("liql_estado") === 'Q');
		}

		// Declaración de variables generales
		let mCountRowDserv	= mRsDatosDServ.getRowCount();
		let mBcCpHistorial	= 0.00;
		let mIndDserv		= 1;
		let mDateFec		= '';
		let mIntSerDserv	= '';
		let mIntSecu_serv	= 0;
		let mIntFirst		= 0;
		let mIntSecond		= 0;
		let mIntIndicador	= 0;
		let mIntSer			= [];

        // Recorrido de los datos obtenidos
		mRsDatosDServ.forEach((mRow) => {
            try {
                /**
				 * La cantidad para servicios es entero, pero es informado como un decimal
				 * se concatena una "a" para que se vuelva una cadena y asi poder aplicar
				 * ".split()" para obtener el monto correcto
				 */
				let mIntCant		= mRow.liql_cantidad + "a"
				let mIntCantidad	= mIntCant.split('.');
				let mDbImporteCoa	= 0.00;
				let mDbCopagoFij	= 0.00;
				let mDbMontoUnit	= 0.00;

				if (!mRow.med_tipocodigo) {
					mRow.med_tipocodigo	= '00'
				}
				/**
				 * Si el código del tipo de médico es "00" (Personal de la salud sin colegiatura)
				 * se asignan campos en blanco
				 */
				if (mRow.med_tipocodigo	== '00') {
					mRow.med_colegiatura	= ' '
					mRow.med_tipodoc		= ' '
					mRow.med_documento		= ' '
				}

				/**
				 * Si existen consumos de oxígeno, el código a usar es el "0013" y se aplican
				 * cantidad = 1 como medida de protección
				 */
				if (/\b0013/.test(mRow.liql_presta_fact)) {
					mRow.liql_presta_fact	= '0013'
					mIntCantidad[0]			= '1'
				}

				// Obtención de los copagos en base al liql_presta_fact
				mDbCopagoFij = !mRow.liql_importe_coa_fijo ? 0.00 : mRow.liql_importe_coa_fijo;
				if (mRow.liql_importe_coa_fijo > mBcCpHistorial) {
					mBcCpHistorial = mRow.liql_importe_coa_fijo;
				}
				if (mIndDserv == mCountRowDserv && mBcCpHistorial == 0.00) {
					mDbCopagoFij = mRow.liq_importe_ded
					mIndDserv = 0
				}
				mIndDserv ++

				// El Importe Coa es informado por liql_importe_neto_coa_pp
				mDbImporteCoa = mRow.liql_importe_neto_coa_pp

				// Ajuste del Copago Fijo y variable cuando hay deducible
				 if (mDbCopagoFij > 0.00) {
					let mBcAjusteCp		= Ax.math.bc.sub(mRow.liq_importe_ded, mDbCopagoFij);
						mDbImporteCoa	= Ax.math.bc.sub(mDbImporteCoa, mBcAjusteCp);
						mDbCopagoFij	= mRow.liq_importe_ded;
				}

				/**
				 * Protección por si la cantidad es "0.00" ya que posteriormente se divide
				 * el importe netro entre la cantidad
				 */
				if (mRow.liql_cantidad == 0.00) {
					mRow.liql_cantidad = 1.00;
				}

				/**
				 * Si tiene informado los factores, se actualiza la cantidad entorno
				 * al % del procedimiento aplicado
				 */
				let mBcPrcjFactor = Ax.math.bc.mul(mRow.acp_factor_1, mRow.acp_factor_2, mRow.acp_factor_3, mRow.acp_factor_4, mRow.acp_factor_5);
				if (mBcPrcjFactor > 1) {
					mIntCantidad[0]		= mBcPrcjFactor.setScale(0, Ax.math.bc.RoundingMode.UP)
					mRow.liql_cantidad	= mIntCantidad[0]
				}

				/**
				 * Definición del monto unitario, pero si es un consumo de oxígeno,
				 * el monto unitario pasa a ser igual al importe neto
				 */
				if (mRow.liql_presta_fact == '0013') {
					mDbMontoUnit = mRow.liql_importe_neto;
				} else {
					mDbMontoUnit = Ax.math.bc.div(mRow.liql_importe_neto, mRow.liql_cantidad);
				}

				/**
				 * Redondeo del monto unitario cuando la cantidad es mayor a 1 acompañado de un
				 * indicador para alternar el redondeo hacia arriba y el redondeo hacia abajo
				 */
				let mRoundDown	= mDbMontoUnit.setScale(2, Ax.math.bc.RoundingMode.HALF_DOWN)
				let mRoundUp	= mDbMontoUnit.setScale(2, Ax.math.bc.RoundingMode.HALF_UP)
				if (Ax.math.bc.compareTo(mRoundDown,mRoundUp) != 0 && mIndRound == 0 && mBcPrcjFactor > 1) {
					mDbMontoUnit = mDbMontoUnit.setScale(2, Ax.math.bc.RoundingMode.HALF_DOWN)
					mIndRound ++;
				} else if (Ax.math.bc.compareTo(mRoundDown,mRoundUp) != 0 && mIndRound == 1 && mBcPrcjFactor > 1) {
					mDbMontoUnit = mDbMontoUnit.setScale(2, Ax.math.bc.RoundingMode.HALF_UP)
					mIndRound --;
				}

				/**
				 * Verifica si hay episodio padre para colocar
				 * una marca y aumentar el conteo de nro de prestaciones
				 */
				let mIntIndPadre = 0
				if (mRow.serv_correlativo == 2) {
					mIntIndPadre	= 1;
					mIntDServ		= 1;
					if (mStrEpPadre == '' && mIndFinanciador == 0) {
						mStrEpPadre		= mRowData.adm_episodio_padre;
						mIntSecu_serv	= 0;
						mCountFichServ	++;
					}
				}

				// Secuenciadores por facturas y liquidaciones
				if (mStrLiq_serv != mRowData.liq_id) {
					mStrLiq_serv = mRowData.liq_id
					mCountFichServ ++;
				}

				if (mStrFact_serv == mRow.fvh_numero) {
					mIntSecu_serv ++;
				} else {
					mIntSecu_serv	= 1;
					mCountFichServ	= 1;
					mStrFact_serv	= mRow.fvh_numero;
					mStrEpPadre		= '';
				}

				// Se informa la fecha mayor entre la fecha de gestión de cuentas y la de admisión
				let mDateFecServ;
				if (mRow.acp_fecha > mRow.adm_fecha) {
					mDateFecServ = new Ax.util.Date(mRow.acp_fecha)
					mDateFecServ = mDateFecServ.format('dd-MM-yyyy')
				} else {
					mDateFecServ = new Ax.util.Date(mRow.adm_fecha)
					mDateFecServ = mDateFecServ.format('dd-MM-yyyy')
				}

				// Inserción en la tabla Dserv
				mIntSerDserv = Ax.db.insert('fas_tedef_dserv_test',
					{
						"tdserv_nrolote"		: mRow.tdf_nrolote,
						"tdserv_ruc"			: mRow.emp_nif,
						"tdserv_ipress"			: mRow.cen_refaux1,
						"tdserv_tipodocpg"		: mRow.fvt_codigo_tipo,
						"tdserv_nrodocpg"		: mRow.fvh_numero,
						"tdserv_centro"			: mStrCentro,
						"tdserv_pres"			: mCountFichServ,
						"tdserv_corserv"		: mIntSecu_serv,
						"tdserv_tipclasserv"	: "03",
						"tdserv_codclasproc"	: mRow.liql_presta_fact,
						"tdserv_grupo_cont"		: mRow.pre_grupo_contable,
						"tdserv_descserv"		: mRow.pre_nombre,
						"tdserv_fecproc"		: mDateFecServ,
						"tdserv_tipprofres"		: mRow.med_tipocodigo,
						"tdserv_nrocoleg"		: mRow.med_colegiatura,
						"tdserv_tipdocprof"		: mRow.med_tipodoc,
						"tdserv_nrodocprof"		: mRow.med_documento,
						"tdserv_nroserv"		: mIntCantidad[0],
						"tdserv_mntuni"			: mDbMontoUnit,
						"tdserv_mntuni_round"	: Ax.math.bc.of(mDbMontoUnit).setScale(2, Ax.math.bc.RoundingMode.HALF_DOWN),
						"tdserv_cpgvarproc"		: mDbImporteCoa,
						"tdserv_cpgvr_round"	: Ax.math.bc.of(mDbImporteCoa).setScale(2, Ax.math.bc.RoundingMode.HALF_DOWN),
						"tdserv_cpgfjproc"		: mDbCopagoFij,
						"tdserv_cpgfj_round"	: Ax.math.bc.of(mDbCopagoFij).setScale(2, Ax.math.bc.RoundingMode.HALF_DOWN),
						"tdserv_servexeimp"		: mRow.liql_impuesto,
						"tdserv_mntprocserv"	: 0.00,
						"tdserv_mntnocubserv"	: 0.00,
						"tdserv_diagaso"		: 'AX',
						"tdserv_codrubro"		: '15',
						"tdserv_ind_padre"		: mIntIndPadre,
						"tdserv_liql_id"		: mRow.liql_id
					}
				).getSerial();

				// Definicion de variables para la obtención del rubro
				let mDateFecha		= new Ax.util.Date(mRow.date_created);
					mDateFecha		= mDateFecha.format('dd-MM-yyyy');
				let mStrCodTipConc	= mRow.cfa_tipo_concepto;
				let mStrCodConc		= mRow.cfa_codigo;
				let mStrPresCod		= mRow.pre_codigo;
				let mStrAyudante	= mRow.acp_tipo_funcion;
				let mIntRubro 		= '15';

				// Reglas para la definición del código del rubro 
				if (mStrCodTipConc == '2') {
					mIntRubro = '03'
				}
				if (mStrCodConc == '9' || mStrCodConc == '10') {
					mIntRubro = '05'
				}
				if (mStrAyudante == '1101' || mStrAyudante == '1102') {
					mIntRubro = '08'
				}
				if (mStrCodConc == '227') {
					mIntRubro = '11'
				}
				if (mStrCodConc == '231' || mStrCodConc == '242') {
					mIntRubro = '04'
				}
				if (mStrCodConc == '236') {
					mIntRubro = '06'
				}
				if (mStrCodConc == '239') {
					mIntRubro = '10'
				}
				if (mStrCodConc == '266') {
					mIntRubro = '02';
				}
				if (mStrCodConc == '267') {
					mIntRubro = '07'
				}
				if (mStrCodConc == '160' || mStrCodConc == '240') {
					mIntRubro = '08'
				}
				if (mStrCodConc == '268') {
					mIntRubro = '09'
				}
				if (/\b0013/.test(mStrPresCod)) {
					mIntRubro = '05'
				}
				if (mStrPresCod == '000501') {
					mIntRubro = '15'
				}
				if (/\b22/.test(mStrPresCod)) {
					mIntRubro = '11'
				}

				/**
				 * Condición compuesta: Si el código de la prestacion comienza con ("0001", "0002", "0004", "0007") el rubro será 01,
				 * no obstante, si en una misma fecha, existe el código que comience con ("0001", "0002") y aparece una prestación
				 * que inicie con ("0007"), dichas prestaciones tomarán el rubro nro "15".
				 * 
				 * Cabe recalcar que tambien puede llegar primero la prestación que inicie con ("0007") y posteriormente las 
				 * prestaciones que inicien en ("0001", "0002") y tambien aplica que el rubro será "15".
				 * 
				 * Tambien es importante mencionar que, si está presente la prestación que inicia con ("0007"), si siguen cayendo prestaciones
				 * que inicien en ("0001", "0002") en la misma fecha en la que se informó el ("0007"), el rubro de las prestaciones que
				 * inician en ("0001","0002") serán "15"
				 * 
				 * Esta validación se realiza por fecha.
				 */
				if (/\b0001/.test(mStrPresCod) || /\b0002/.test(mStrPresCod) || /\b0004/.test(mStrPresCod) || /\b0007/.test(mStrPresCod)) {
					mIntRubro = '01'

					// Si la fecha cambia, se reinician los contadores de apoyo
					if (mDateFec == '' || mDateFec != mDateFecha) {
						mDateFec = mDateFecha;
						mIntFirst = 0;
						mIntSecond = 0;
						mIntIndicador = 0;
						mIntSer = [];
					}

					/**
					 * Se asigna una bandera cuando cae la prestación que inicia con ("0007")
					 * a su vez, se guarda el serial para posteriormente updatear el rubro.
					 * Se realiza una suma entre las variables mIntFirst y mIntSecond para
					 * identificar si se encontraron las prestaciones que inician con 
					 * ("0001", "0002") y ("0007")
					 */
					if (/\b0007/.test(mStrPresCod)) {
						mIntSecond = 1;
						mIntSer.push(mIntSerDserv);
						mIntIndicador = mIntFirst + mIntSecond;
					} else if (/\b0001/.test(mStrPresCod) || /\b0002/.test(mStrPresCod)) {
						mIntFirst = 1;
						mIntIndicador = mIntFirst + mIntSecond;
					}

					/**
					 * Si se encuentran las prestaciones que inician con ("0001", "0002") y ("0007")
					 * se updatea los rubros correspondientes y se reinicia el contador de las
					 * prestaciones que inician con ("0001", "0002")
					 */
					if (mIntIndicador == 2) {
						mIntRubro = '15';
						for (let mIndFor = 0; mIndFor < mIntSer.length; mIndFor++) {
							Ax.db.update('fas_tedef_dserv_test',
								{
									"tdserv_codrubro"	: mIntRubro
								},
								{
									"tdserv_serial"		: mIntSer[mIndFor]
								}
							);
						}
						mIntSecond = 0;
					}
				}

				if (/\b0039/.test(mStrPresCod)) {
					mIntRubro = '13'
				}
				if (/\b44/.test(mStrPresCod) || /\b48/.test(mStrPresCod)) {
					mIntRubro = '10'
				}
				if (/\b51/.test(mStrPresCod) && 
				(mRow.fin_codigo_aux2 == '50548' || mRow.fin_codigo_aux2 == '40051' || mRow.fin_codigo_aux2 == '47668' || mRow.fin_codigo_aux2 == '30005') && 
				mRow.adm_ambito == 'H') {
					mIntRubro = '07'
				}
				if (/\b50/.test(mStrPresCod)) {
					mIntRubro = '02'
				}
				if (/\b50/.test(mStrPresCod) &&
				(mRow.fin_codigo_aux2 == '40051' || mRow.fin_codigo_aux2 == '47668' || mRow.fin_codigo_aux2 == '30005' || mRow.fin_codigo_aux2 == '50548 ') && 
				mRow.adm_ambito == 'H') {
					mIntRubro = '07'
				}

				// Recuperación del diagnostico principal para Dserv
				let mStrDiagDserv = Ax.db.executeGet(`
					<select first='1'>
						<columns>
							adg_diagnostico
						</columns>
						<from table = 'fas_admision_diag' />
						<where>
								adg_episodio = ?
							AND adg_diagnostico != ""
							AND adg_principal = 1
						</where>
						<order>
							date_created DESC
						</order>
					</select>
				`, mRow.adm_episodio);

				/**
				 * Si el diagnostico principal esta informado como vacío o nulo,
				 * se toma en cuenta el diagnostico secundario
				 */
				if (mStrDiagDserv == '' || mStrDiagDserv == null) {
					mStrDiagDserv = Ax.db.executeGet(`
						<select first='1'>
							<columns>
								adg_diagnostico
							</columns>
							<from table = 'fas_admision_diag' />
							<where>
									adg_episodio	= ?
								AND adg_diagnostico != ""
								AND adg_principal	= 2
							</where>
							<order>
								date_created DESC
							</order>
						</select>
					`, mRow.adm_episodio);
				}

				/**
				 * Si el diagnóstico llega mal informado (3 caracteres), se le aumentará ".X" como protección
				 * para que no salten errores al momento de pasar por SUSALUD
				 */
				if (mStrDiagDserv.length == '3') {
					mStrDiagDserv = mStrDiagDserv + ".X"
				}

				// Verificación si es monto cubierto o no cubierto
				let mIntMntNCub	= 0.00;
				let mIntMntCub	= 0.00;

				/**
				 * Cuando se presenta el oxígeno, mDbMontoUnit = Importe neto, si es otra prestacion mDbMontoUnit = Importe neto / cantidad
				 * 
				 * Si la prestación es un consumo de oxígeno, el monto cubierto será el monto unitario (importe neto)
				 * si no es un consumo de exígeno, será la multiplicacion entre cantidad y el monto unitario (importe neto)
				 */
				if (mRow.liql_presta_fact == '0013') {
					mIntMntCub	= mDbMontoUnit
				} else {
					mIntMntCub	= Ax.math.bc.mul(mDbMontoUnit, mRow.liql_cantidad);
				}

				// Asignación del monto no cubierto
				if (mRow.acp_cubierto == 0) {
					mIntMntNCub	= mRow.liql_importe_neto;
				}

				// Updateamos los campos calculados con las reglas previas
				Ax.db.update('fas_tedef_dserv_test',
					{
						"tdserv_mntprocserv"	: mIntMntCub,
						"tdserv_igv_round"		: Ax.math.bc.of(mIntMntCub).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdserv_mntnocubserv"	: mIntMntNCub,
						"tdserv_mnttot_round"	: Ax.math.bc.of(mIntMntNCub).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
						"tdserv_diagaso"		: mStrDiagDserv,
						"tdserv_codrubro"		: mIntRubro
					},
					{
						"tdserv_serial"			: mIntSerDserv
					}
				);
            } catch(e) {
				console.error('DSERV:', e)
				/**
				 * Almacenamiento de las facturas que tienen algún error al updaterar
				 */

				mStrFacturas = mStrFacturas + mRow.fvh_numero + " ";
				contador ++;

			}
        });
        mRsDatosDServ.close();

        /**
		 * Ajustamos los montos de dserv informados, redondeandolo a 2 decimales para
		 * que pasen las tramas
		 */
		let mObjDservRound = Ax.db.executeQuery(`
			<select>
				<columns>
					NVL(ROUND(SUM(tdserv_mntuni), 2), 0.00)			tdserv_mntuni,
					NVL(SUM(tdserv_mntuni_round), 0.00)				tdserv_mntuni_round,
					NVL(ROUND(SUM(tdserv_cpgvarproc), 2), 0.00)		tdserv_cpgvarproc,
					NVL(SUM(tdserv_cpgvr_round), 0.00)				tdserv_cpgvr_round,
					NVL(ROUND(SUM(tdserv_cpgfjproc), 2), 0.00)		tdserv_cpgfjproc,
					NVL(SUM(tdserv_cpgfj_round), 0.00)				tdserv_cpgfj_round,
					NVL(ROUND(SUM(tdserv_mntprocserv), 2), 0.00)	tdserv_mntprocserv,
					NVL(SUM(tdserv_igv_round), 0.00)				tdserv_igv_round,
					NVL(ROUND(SUM(tdserv_mntnocubserv), 2), 0.00)	tdserv_mntnocubserv,
					NVL(SUM(tdserv_mnttot_round), 0.00)				tdserv_mnttot_round
				</columns>
				<from table = 'fas_tedef_dserv_test' />
				<where>
						tdserv_nrolote	= ?
					AND tdserv_nrodocpg	= ?
					AND tdserv_centro	= ?
				</where>
			</select>
		`, mStrLote, mRowData.fvh_numero, mStrCentro).toOne();

		// Declaración de variables a usar para las verificaciones
		let mBcDifMntUnitServ	= 0.00;
		let mBcDifCpVrServ		= 0.00;
		let mBcDifCpFjServ		= 0.00;
		let mBcDifMntCubServ	= 0.00;
		let mBcDifMntNCubServ	= 0.00;
		let mRsServRound		= Ax.db.executeQuery(`
			<select>
				<columns>
					tdserv_serial,
					tdserv_mntuni_round,
					tdserv_cpgvr_round,
					tdserv_cpgfj_round,
					tdserv_igv_round,
					tdserv_mnttot_round
				</columns>
				<from table = 'fas_tedef_dserv_test' />
				<where>
						tdserv_nrolote	= ?
					AND tdserv_nrodocpg	= ?
					AND tdserv_centro	= ?
				</where>
			</select>
		`, mStrLote, mRowData.fvh_numero, mStrCentro).toMemory();

		if (mRsServRound.getRowCount()) {
			// Verificación si hay diferencia entre los montos de farm originales y los redondeados
			if (mObjDservRound.tdserv_mntuni.compareTo(mObjDservRound.tdserv_mntuni_round) != 0) {
				mBcDifMntUnitServ	= Ax.math.bc.sub(mObjDservRound.tdserv_mntuni, mObjDservRound.tdserv_mntuni_round)
			}

			if (mObjDservRound.tdserv_cpgvarproc.compareTo(mObjDservRound.tdserv_cpgvr_round) != 0) {
				mBcDifCpVrServ		= Ax.math.bc.sub(mObjDservRound.tdserv_cpgvarproc, mObjDservRound.tdserv_cpgvr_round)
			}

			if (mObjDservRound.tdserv_cpgfjproc.compareTo(mObjDservRound.tdserv_cpgfj_round) != 0) {
				mBcDifCpFjServ		= Ax.math.bc.sub(mObjDservRound.tdserv_cpgfjproc, mObjDservRound.tdserv_cpgfj_round)
			}

			if (mObjDservRound.tdserv_mntprocserv.compareTo(mObjDservRound.tdserv_igv_round) != 0) {
				mBcDifMntCubServ	= Ax.math.bc.sub(mObjDservRound.tdserv_mntprocserv, mObjDservRound.tdserv_igv_round)
			}

			if (mObjDservRound.tdserv_mntnocubserv.compareTo(mObjDservRound.tdserv_mnttot_round) != 0) {
				mBcDifMntNCubServ	= Ax.math.bc.sub(mObjDservRound.tdserv_mntnocubserv, mObjDservRound.tdserv_mnttot_round)
			}

			mRsServRound.forEach((mRowServRound) => {
				// Verificación del monto unitario
				if (mBcDifMntUnitServ < 0.00) {
					if (mRowServRound.tdserv_mntuni_round > 0.00) {
						mRowServRound.tdserv_mntuni_round = Ax.math.bc.sub(mRowServRound.tdserv_mntuni_round, 0.01);
						mBcDifMntUnitServ = Ax.math.bc.add(mBcDifMntUnitServ, 0.01);
						if (mBcDifMntUnitServ > 0.00) {
							mBcDifMntUnitServ = 0.00
						}
					}
				} else if (mBcDifMntUnitServ > 0.00) {
					if (mRowServRound.tdserv_mntuni_round > 0.00) {
						mRowServRound.tdserv_mntuni_round = Ax.math.bc.add(mRowServRound.tdserv_mntuni_round, 0.01)
						mBcDifMntUnitServ = Ax.math.bc.sub(mBcDifMntUnitServ, 0.01)
						if (mBcDifMntUnitServ < 0.00) {
							mBcDifMntUnitServ = 0.00
						}
					}
				}

				// Verificación del copago variable
				if (mBcDifCpVrServ < 0.00) {
					if (mRowServRound.tdserv_cpgvr_round > 0.00) {
						mRowServRound.tdserv_cpgvr_round = Ax.math.bc.sub(mRowServRound.tdserv_cpgvr_round, 0.01);
						mBcDifCpVrServ = Ax.math.bc.add(mBcDifCpVrServ, 0.01);
						if (mBcDifCpVrServ > 0.00) {
							mBcDifCpVrServ = 0.00
						}
					}
				} else if (mBcDifCpVrServ > 0.00) {
					if (mRowServRound.tdserv_cpgvr_round > 0.00) {
						mRowServRound.tdserv_cpgvr_round = Ax.math.bc.add(mRowServRound.tdserv_cpgvr_round, 0.01)
						mBcDifCpVrServ = Ax.math.bc.sub(mBcDifCpVrServ, 0.01)
						if (mBcDifCpVrServ < 0.00) {
							mBcDifCpVrServ = 0.00
						}
					}
				}

				// Verificación del copago fijo
				if (mBcDifCpFjServ < 0.00) {
					if (mRowServRound.tdserv_cpgfj_round > 0.00) {
						mRowServRound.tdserv_cpgfj_round = Ax.math.bc.sub(mRowServRound.tdserv_cpgfj_round, 0.01);
						mBcDifCpFjServ = Ax.math.bc.add(mBcDifCpFjServ, 0.01);
						if (mBcDifCpFjServ > 0.00) {
							mBcDifCpFjServ = 0.00
						}
					}
				} else if (mBcDifCpFjServ > 0.00) {
					if (mRowServRound.tdserv_cpgfj_round > 0.00) {
						mRowServRound.tdserv_cpgfj_round = Ax.math.bc.add(mRowServRound.tdserv_cpgfj_round, 0.01)
						mBcDifCpFjServ = Ax.math.bc.sub(mBcDifCpFjServ, 0.01)
						if (mBcDifCpFjServ < 0.00) {
							mBcDifCpFjServ = 0.00
						}
					}
				}

				// Verificacióon del monto total
				if (mBcDifMntCubServ < 0.00) {
					if (mRowServRound.tdserv_igv_round > 0.00) {
						mRowServRound.tdserv_igv_round = Ax.math.bc.sub(mRowServRound.tdserv_igv_round, 0.01);
						mBcDifMntCubServ = Ax.math.bc.add(mBcDifMntCubServ, 0.01);
						if (mBcDifMntCubServ > 0.00) {
							mBcDifMntCubServ = 0.00
						}
					}
				} else if (mBcDifMntCubServ > 0.00) {
					if (mRowServRound.tdserv_igv_round > 0.00) {
						mRowServRound.tdserv_igv_round = Ax.math.bc.add(mRowServRound.tdserv_igv_round, 0.01)
						mBcDifMntCubServ = Ax.math.bc.sub(mBcDifMntCubServ, 0.01)
						if (mBcDifMntCubServ < 0.00) {
							mBcDifMntCubServ = 0.00
						}
					}
				}

				// Verificacióon del monto no cubierto
				if (mBcDifMntNCubServ < 0.00) {
					if (mRowServRound.tdserv_mnttot_round > 0.00) {
						mRowServRound.tdserv_mnttot_round = Ax.math.bc.sub(mRowServRound.tdserv_mnttot_round, 0.01);
						mBcDifMntNCubServ = Ax.math.bc.add(mBcDifMntNCubServ, 0.01);
						if (mBcDifMntNCubServ > 0.00) {
							mBcDifMntNCubServ = 0.00
						}
					}
				} else if (mBcDifMntNCubServ > 0.00) {
					if (mRowServRound.tdserv_mnttot_round > 0.00) {
						mRowServRound.tdserv_mnttot_round = Ax.math.bc.add(mRowServRound.tdserv_mnttot_round, 0.01)
						mBcDifMntNCubServ = Ax.math.bc.sub(mBcDifMntNCubServ, 0.01)
						if (mBcDifMntNCubServ < 0.00) {
							mBcDifMntNCubServ = 0.00
						}
					}
				}

				// Actualización de las linas
				Ax.db.update('fas_tedef_dserv_test',
					{
						"tdserv_mntuni_round"	: mRowServRound.tdserv_mntuni_round,
						"tdserv_cpgvr_round"	: mRowServRound.tdserv_cpgvr_round,
						"tdserv_cpgfj_round"	: mRowServRound.tdserv_cpgfj_round,
						"tdserv_igv_round"		: mRowServRound.tdserv_igv_round,
						"tdserv_mnttot_round"	: mRowServRound.tdserv_mnttot_round
					},
					{
						"tdserv_serial"			: mRowServRound.tdserv_serial
					}
				);
			});
			mRsServRound.close();
		}

        /*****************************************************************************************/
        /*************************************** ATENCIÓN ****************************************/
        /*****************************************************************************************/

        /**
		 * Obtenemos en número máximo de prestacion informada en servicios y farmacia
		 * el mayor de ellos será la cantidad de veces que se recorrerá para fas_tedef_date_test
		 */
		let mIntMax		= 1;
		let mIntMaxFarm	= 1;
		let mIntMaxServ	= 1;

		/**
		 * Si el indicador es 1, significa que hay cobertura diferenciada
		 * por ende, se necesita obtener el número máximo generado para realizar
		 * los recorridos para llenar los datos de Date
		 */
		if (mIntDServ == 1) {
			mIntMaxServ = Ax.db.executeGet(`
				<select>
					<columns>
						MAX(tdserv_pres)
					</columns>
					<from table = 'fas_tedef_dserv_test' />
					<where>
							tdserv_nrodocpg	= ?
						AND tdserv_nrolote	= ?
					</where>
				</select>
			`, mRowData.fvh_numero, mRowData.tdf_nrolote);

			mIntMaxFarm = Ax.db.executeGet(`
				<select>
					<columns>
						MAX(tdfarm_pres)
					</columns>
					<from table = 'fas_tedef_dfarm_test' />
					<where>
							tdfarm_nrodocpg = ?
						AND tdfarm_nrolote = ?
					</where>
				</select>
			`, mRowData.fvh_numero, mRowData.tdf_nrolote);

			if (mIntMaxFarm > mIntMaxServ) {
				mIntMax = mIntMaxFarm;
			} else {
				mIntMax = mIntMaxServ;
			}
		}

		// Reseteamos el indicador para el siguiente lote
		mIntDServ = 0;

        /**
		 * Recorridos necesarios para Date, tambien toma en cuenta las facturas globales
		 * asi como las coberturas diferenciadas
		 */
		for (let mCountDate = 1; mCountDate <= mIntMax; mCountDate++) {

			// Recuperado de lineas para insertar en date
			let mRsDate = Ax.db.executeQuery(`
				<select first = '1'>
					<columns>
						fas_tedef_factura.tdf_nrolote,
						fas_empresa.emp_nif,
						fas_centro.cen_refaux1,
						fas_factura_venta_tipo.fvt_refaux1,
						fas_factura_venta.fvh_numero,
						fas_factura_venta.fvh_financiador,
						fas_admision_aut.aut_cobertura,
						fas_admision_aut.aut_tipo_prod,
						fas_admision_aut.aut_afiliado_numero,
						fas_admision_aut.aut_tipo_documento_tit,
						fas_admision_aut.aut_numero_documento_tit,
						fas_admision.adm_historia_clinica,
						fas_admision_aut.aut_tipo,
						fas_admision_aut.aut_numero,
						fas_admision_aut.aut_codigo_prod,
						fas_admision_aut.aut_codigo_acc,
						fas_ambito_grupo.amg_codigo,
						fas_cobertura.cob_tipo,
						fas_cobertura.cob_auxchr1,
						fas_admision.adm_fecha,
						fas_admision_aut.date_created,
						fas_medico.med_tipocodigo,
						fas_medico.med_colegiatura,
						fas_medico.med_tipodoc,
						fas_medico.med_documento,
						fas_admision.adm_tipo_internamiento,
						nvl(fas_admision.adm_fecha_alta, adm_fecha_fin_vigencia) adm_fecha_alta,
						fas_admision.adm_motivo_alta,
						fas_admision.adm_estimado_estancia,
						fas_liquidacion_impuesto.liqi_impuesto,
						fas_liquidacion_impuesto.liqi_importe_ded,
						fas_liquidacion_impuesto.liqi_importe_dif_cuarto,
						fas_admision.adm_episodio,
						SUM((fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>)) liql_importe_neto,
						SUM(NVL(fas_liquidacion_linea.liql_importe_neto_difd,0.00)) liql_importe_neto_difd,
						SUM(NVL(fas_liquidacion_linea.liql_importe_dif_cuarto,0.00)) liql_importe_dif_cuarto,
						SUM(NVL(fas_liquidacion_linea.liql_importe_neto_coa,0.00)) liql_importe_neto_coa,
						SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
											THEN ((fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) * liql_cantidad) * (1 - liql_factor_coa / 100)
											ELSE (fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) - <nvl>liql_importe_neto_coa,0</nvl>
										END
							END ) liql_importe_neto_coa_pp
					</columns>
						<from table = 'fas_tedef_factura'>
							<join table='fas_factura_venta'>
								<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
								<join table='fas_factura_venta_tipo'>
									<on>fas_factura_venta.fvt_codigo_tipo = fas_factura_venta_tipo.fvt_codigo</on>
								</join>
								<join table='fas_centro'>
									<on>fas_factura_venta.fvh_centro = fas_centro.cen_codigo</on>
									<join table='fas_empresa'>
										<on>fas_centro.emp_codigo = fas_empresa.emp_codigo</on>
									</join>
								</join>
								<join table='fas_factura_venta_linea'>
									<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
									<join table='fas_factura_venta_enlace' >
										<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
										<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
										<join table='fas_liquidacion_linea'>
											<on>fas_factura_venta_enlace.liql_id = fas_liquidacion_linea.liql_id</on>
											<on>fas_factura_venta_enlace.liq_id = fas_liquidacion_linea.liq_id</on>
											<join table='fas_liquidacion'>
												<on>fas_liquidacion_linea.liq_id = fas_liquidacion.liq_id</on>
												<join table='fas_liquidacion_impuesto'>
													<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
													<on>fas_liquidacion_impuesto.liqi_impuesto = fas_factura_venta_linea.fvl_impuesto</on>
												</join>
												<join table='fas_cuenta'>
													<on>fas_liquidacion.liq_cnt_id = fas_cuenta.cnt_id</on>
													<join table='fas_admision'>
														<on>fas_cuenta.cnt_episodio = fas_admision.adm_episodio</on>
														<join table='fas_admision_aut'>
															<on>fas_admision.adm_episodio = fas_admision_aut.aut_episodio</on>
															<join table='fas_cobertura'>
																<on>fas_admision_aut.aut_cobertura = fas_cobertura.cob_codigo</on>
															</join>
														</join>
														<join table='fas_medico'>
															<on>fas_admision.${mSqlMedico} = fas_medico.med_codigo</on>
														</join>
														<join table='fas_ambito'>
															<on>fas_admision.adm_ambito = fas_ambito.amb_codigo</on>
															<join table='fas_ambito_grupo'>
																<on>fas_ambito.amb_grupo_cod = fas_ambito_grupo.amg_codigo</on>
															</join>
														</join>
													</join>
												</join>
											</join>
										</join>
									</join>
								</join>
							</join>
						</from>
					<where>
							fas_tedef_factura.tdf_nrolote = ?
						AND fas_factura_venta.fvh_numero = ?
						AND ${mStrSqlCond}
						AND fas_liquidacion.liq_episodio = ?
						AND fas_cuenta.cnt_id = ?
						AND fas_admision_aut.aut_tipo != '99'
						AND fas_admision_aut.aut_estado = 'A'
						AND fas_liquidacion_linea.liql_estado IN ('P','F','Q')
                        ${mStrCondFact}
					</where>
					<order>
						fas_admision_aut.date_created
					</order>
					<group>
						1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
						21,22,23,24,25,26,27,28,29,30,31,32,33
					</group>
				</select>
			`, mRowData.tdf_nrolote, mRowData.fvh_numero, mRowData.liq_episodio, mRowData.liq_cnt_id).toMemory();
            
			// Verificación si hay lineas informadas para Date
			if (mRsDate.getRowCount() > 0) {

				// Recorrido de los datos recuperados
				mRsDate.forEach((row) => {
					try {
						if (mCountDate == 2) {
							let mArrDatosEpiPadre = Ax.db.executeQuery(`
								<select first = '1'>
									<columns>
										DISTINCT
										fas_admision_aut.aut_cobertura,
										fas_admision_aut.aut_tipo_prod,
										fas_admision_aut.aut_afiliado_numero,
										fas_admision_aut.aut_tipo_documento_tit,
										fas_admision_aut.aut_numero_documento_tit,
										fas_admision.adm_historia_clinica,
										fas_admision_aut.aut_tipo,
										fas_admision_aut.aut_numero,
										fas_admision_aut.aut_codigo_prod,
										fas_admision_aut.aut_codigo_acc,
										fas_ambito_grupo.amg_codigo,
										fas_cobertura.cob_tipo,
										fas_cobertura.cob_auxchr1,
										fas_admision.adm_fecha,
										fas_medico.med_tipocodigo,
										fas_medico.med_colegiatura,
										fas_medico.med_tipodoc,
										fas_medico.med_documento,
										fas_admision.adm_tipo_internamiento,
										fas_admision.adm_fecha_alta,
										fas_admision.adm_motivo_alta,
										fas_admision.adm_estimado_estancia,
										fas_admision.adm_episodio
									</columns>
									<from table = 'fas_admision'>
										<join table = 'fas_admision_aut'>
											<on>fas_admision.adm_episodio = fas_admision_aut.aut_episodio</on>
											<join table='fas_cobertura'>
												<on>fas_admision_aut.aut_cobertura = fas_cobertura.cob_codigo</on>
											</join>
										</join>
										<join table = 'fas_cuenta'>
											<on>fas_admision.adm_episodio = fas_cuenta.cnt_episodio</on>
										</join>
										<join table='fas_medico'>
											<on>fas_admision.${mSqlMedico} = fas_medico.med_codigo</on>
										</join>
										<join table='fas_ambito'>
											<on>fas_admision.adm_ambito = fas_ambito.amb_codigo</on>
											<join table='fas_ambito_grupo'>
												<on>fas_ambito.amb_grupo_cod = fas_ambito_grupo.amg_codigo</on>
											</join>
										</join>
									</from>
									<where>
											fas_admision.adm_episodio = ?
										AND fas_admision_aut.aut_estado = 'A'
										AND fas_admision_aut.aut_tipo != '99'
									</where>
								</select>
							`, mRowData.adm_episodio_padre).toOne();

							// Si existe data, llenar los campos para la linea del padre
							if (mArrDatosEpiPadre.adm_episodio) {
								row.aut_cobertura				= mArrDatosEpiPadre.aut_cobertura;
								row.aut_tipo_prod				= mArrDatosEpiPadre.aut_tipo_prod;
								row.aut_afiliado_numero			= mArrDatosEpiPadre.aut_afiliado_numero;
								row.aut_tipo_documento_tit		= mArrDatosEpiPadre.aut_tipo_documento_tit;
								row.aut_numero_documento_tit	= mArrDatosEpiPadre.aut_numero_documento_tit;
								row.adm_historia_clinica		= mArrDatosEpiPadre.adm_historia_clinica;
								row.aut_tipo					= mArrDatosEpiPadre.aut_tipo;
								row.aut_numero					= mArrDatosEpiPadre.aut_numero;
								row.aut_codigo_prod				= mArrDatosEpiPadre.aut_codigo_prod;
								row.aut_codigo_acc				= mArrDatosEpiPadre.aut_codigo_acc;
								row.amg_codigo					= mArrDatosEpiPadre.amg_codigo;
								row.cob_tipo					= mArrDatosEpiPadre.cob_tipo;
								row.cob_auxchr1					= mArrDatosEpiPadre.cob_auxchr1;
								row.adm_fecha					= mArrDatosEpiPadre.adm_fecha;
								row.med_tipocodigo				= mArrDatosEpiPadre.med_tipocodigo;
								row.med_colegiatura				= mArrDatosEpiPadre.med_colegiatura;
								row.med_tipodoc					= mArrDatosEpiPadre.med_tipodoc;
								row.med_documento				= mArrDatosEpiPadre.med_documento;
								row.adm_tipo_internamiento		= mArrDatosEpiPadre.adm_tipo_internamiento;
								row.adm_fecha_alta				= mArrDatosEpiPadre.adm_fecha_alta;
								row.adm_motivo_alta				= mArrDatosEpiPadre.adm_motivo_alta;
								row.adm_estimado_estancia		= mArrDatosEpiPadre.adm_estimado_estancia;
								row.adm_episodio				= mArrDatosEpiPadre.adm_episodio;
							}
						}

						// Declaración de variables para date
						let cofigv			= 0;
						let cofexo			= 0;
						let covigv			= 0;
						let covexo			= 0;
						let mBcCpFjIgvRound	= Ax.math.bc.of(0);
						let mBcCpFjExoRound	= Ax.math.bc.of(0);
						let mBcCpVrIgvRound	= Ax.math.bc.of(0);
						let mBcCpVrExoRound	= Ax.math.bc.of(0);
						let mBcDifCpFjIgv	= 0;
						let mBcDifCpFjExo	= 0;
						let mBcDifCpVrIgv	= 0;
						let mBcDifCpVrExo	= 0;
						let mStrDiag1		= '';
						let mStrDiag2		= '';
						let mStrDiag3		= '';
						let mIntSerialDate	= '';
						let mIntDiagCont	= 1;
						let mDateFecTemp	= new Ax.util.Date(row.adm_fecha);
						let mStrTipoPrimerDoc;
						let mStrTipCod;
						let mStrTipDoc;

						// Recuperación de los diagnosticos 
						let mRsDiagAte = Ax.db.executeQuery(`
							<select>
								<columns>
									adg_diagnostico
								</columns>
								<from table = 'fas_admision_diag' />
								<where>
										adg_episodio = ?
									AND fas_admision_diag.adg_diagnostico != ''
								</where>
								<order>
									adg_principal,
									date_created DESC
								</order>
							</select>
						`, row.adm_episodio).toMemory();

						// Si el ámbito es diferente a Hospitalario, almacenamos el valor inicial del tipo de autorización
						if (row.amg_codigo != 'H') {
							switch (row.aut_tipo) {
								case "03" :
									mStrTipoPrimerDoc = row.aut_tipo
									break
								default :
									mStrTipoPrimerDoc = "01"
							}
						}

						/**
						 * Asignasión de los diag recuperados a su vez se verifica si estan
						 * mal informados (3 caracteres), si es así, se le aumentará ".X" como
						 * protección para que no salten errores al momento de pasar por SUSALUD
						 */
						for (let row of mRsDiagAte) {
							switch (mIntDiagCont) {
								case 1 :
									if (row.adg_diagnostico.length == '3') {
										mStrDiag1 = row.adg_diagnostico + ".X"
									} else {
										mStrDiag1 = row.adg_diagnostico
									}
									break;
								case 2 :
									if (row.adg_diagnostico.length == '3') {
										mStrDiag2 = row.adg_diagnostico + ".X"
									} else {
										mStrDiag2 = row.adg_diagnostico
									}
									break;
								case 3 :
									if (row.adg_diagnostico.length == '3') {
										mStrDiag3 = row.adg_diagnostico + ".X"
									} else {
										mStrDiag3 = row.adg_diagnostico
									}
									break;
								default :
									break;
							}
							mIntDiagCont ++
						}
						mRsDiagAte.close();

						/**
						 * Si el tipo de documento es null,
						 * se guarda 1 como valor por defecto
						 */
						if (row.med_tipodoc == null) {
							mStrTipDoc = '1'
						} else {
							mStrTipDoc = row.med_tipodoc
						}

						/**
						 * Si el típo del código es null,
						 * se guarda '00' como valor por defecto
						 */
						if (row.med_tipocodigo == null || row.med_tipocodigo == '') {
							mStrTipCod = '00'
						} else {
							mStrTipCod = row.med_tipocodigo
						}

						// Si mStrTipCod = '00', los siguientes campos no se informan
						if (mStrTipCod == '00') {
							row.med_colegiatura	= ' ';
							mStrTipDoc			= ' ';
							row.med_documento	= ' ';
						}

						// Conteo de días de cuarto por prestaciones
						let mDateFechaIngreso	= new Ax.util.Date(row.adm_fecha);
						let mDateFechaEgreso	= new Ax.util.Date(row.adm_fecha_alta);

						// Obtiene la diferencia de dias
						let mIntDifFec		= mDateFechaIngreso.days(mDateFechaEgreso)

						// Condiciones cuando es Hospitalario
						let mStrFechaIngr	= row.adm_fecha;
						let mStrFechaEgre	= row.adm_fecha_alta;
						let mStrDiasEstim	= mIntDifFec;
						let mStrTipoDoc		= '99';
						let mStrMotivoAlt	= '';
						let mStrNroDoc		= '';
						let mStrTipoInter	= '';

						/**
						 * Conversión del tipo de internamiento a los tipos que
						 * SUSALUD toma como válido
						 */
						switch (row.adm_tipo_internamiento) {
							case "T" :
								mStrTipoInter = "C";
								break;
							case "Q" :
								mStrTipoInter = "Q";
								break;
							case "A" :
								mStrTipoInter = "C";
								break;
							case "C" :
								mStrTipoInter = "C";
								break;
							case "H" :
								mStrTipoInter = "C";
								break;
							case "M" :
								mStrTipoInter = "C";
								break;
							case "O" :
								mStrTipoInter = "Q";
								break;
							case "R" :
								mStrTipoInter = "C";
								break;
							case "P" :
								mStrTipoInter = "C";
								break;
							case "D" :
								mStrTipoInter = "C";
								break;
							case "S" :
								mStrTipoInter = "C";
								break;
						}

						/**
						 * Conversión del motivo de alta al motivo que
						 * SUSALUD toma como válido
						 */
						switch (row.adm_motivo_alta) {
							case "2" :
								mStrMotivoAlt = '01';
								break;
							case "5" :
								mStrMotivoAlt = '02';
								break;
							case "6" :
								mStrMotivoAlt = '02';
								break;
							case "9" :
								mStrMotivoAlt = '01';
								break;
							case "10" :
								mStrMotivoAlt = '06';
								break;
							case "11" :
								mStrMotivoAlt = '06';
								break;
							case "14" :
								mStrMotivoAlt = '05';
								break;
							case "23" :
								mStrMotivoAlt = '03';
								break;
							case "27" :
								mStrMotivoAlt = '02';
								break;
							case "29" :
								mStrMotivoAlt = '01';
								break;
							default :
								mStrMotivoAlt = '';
								break;
						}

						/**
						 * Verificación si la cobertura es hospitalario, de no ser así, los siguientes 
						 * campos deben ser informados en blanco
						 */
						if (row.cob_tipo != '5') {
							mStrTipoInter = '';
							mStrFechaIngr = '';
							mStrFechaEgre = '';
							mStrMotivoAlt = '';
							mStrDiasEstim = '';
						} else {
							if (mStrDiasEstim	== '' || mStrDiasEstim == null) {
								mStrDiasEstim	= 0;
							}
						}

						// Obtención de la carta de garantía
						let mArrCartaGarantia = Ax.db.executeQuery(`
							<select first = '1'>
								<columns>
									fas_admision_cg.acg_numero,
									length(fas_admision_cg.acg_numero) largo,
									fas_admision_cg.acg_fecha,
									fas_admision_cg.acg_origen,
									fas_admision_cg.acg_tipo
								</columns>
								<from table = 'fas_admision_cg'>
									<join table = 'fas_admision_garantia'>
										<on>fas_admision_cg.acg_id_garantia = fas_admision_garantia.autg_id</on>
									</join>
								</from>
								<where>
										fas_admision_cg.acg_episodio = ?
									AND fas_admision_cg.acg_numero IS NOT NULL
									AND fas_admision_garantia.autg_tipo = "2"
								</where>
								<order>
									fas_admision_cg.acg_id DESC
								</order>
							</select>
						`, row.adm_episodio).toOne();

                        /**
						 * Si Financiador tiene marca de indicador global y la carta de garantia es diferente a la anterior.
						 * 
                         * Asignacion de valores:
                         *  - mStrIndGlobal: Indicador de factura Individual[N]/Global[S].
                         *  - mObjIndFactGlob: Captura de numero factura e indicador.
                         *  - aux_num_carta: Número de carta de garantia.
                         */
                        if(aux_num_fact == mRowData.fvh_numero && mObjFinanciador.fin_global_ind == 1 && (aux_num_carta != '' && aux_num_carta != mArrCartaGarantia.acg_numero)){
                            
                            mStrIndGlobal = 'S';
                            mObjIndFactGlob[aux_num_fact] = mStrIndGlobal;
                        }
                        aux_num_carta = mArrCartaGarantia.acg_numero;

						let mObjCartaGarantia		= mArrCartaGarantia.acg_numero;
						let mStrDeclaraAccidente	= '';

						/**
						 * Si es Pacífico, se obtiene la carta de garantía como número de
						 * documento de autorización principal
						 */
						if (row.fvh_financiador == '00043392') {

							// Variables a usar para obtener el formato correcto de la carta de garantía
							let mStrCartaGarantia	= '';
							let mStrAddCero			= '';
							let mIntLength;

							/**
							 * Si existe la carta de garantía, colocamos en blanco el segundo documento
							 * de autorización y guardamos la carta de garantía con el siguiente formato
							 * 'yyNroCarta' en donde:	
							 *	yy = Dos ultimas cifras del año
							 *	NroCarta = número de la carta de garantía
							 * El Nro de carta puede llegar en los siguientes formatos: "2024-1234",
							 * "24-1234" o "1234", el nro de carta vendría a ser "1234" el cual debe ser
							 * concatenado con el año y complementando con "0" entre ellos para completar
							 * 8 dígitos (requisito del financiador) 
							 * quedando de la siguiente manera: "24001234"
							 */
							if (mObjCartaGarantia) {
								let mStrAnio			= new Ax.util.Date(mArrCartaGarantia.acg_fecha).format('yyyy');
									mObjCartaGarantia	= mObjCartaGarantia.split("-");
									mIntLength			= mArrCartaGarantia.largo;
									mStrNroDoc			= '';

								// Eliminamos el "-" si es que llega informado
								if (mObjCartaGarantia[1]) {
									mObjCartaGarantia	= mObjCartaGarantia[0] + mObjCartaGarantia[1];
								} else {
									mObjCartaGarantia	= mObjCartaGarantia[0];
								}

								/**
								 * Completado del tamaño con "0" cuando corresponda y ajustado del
								 * año como prefijo del código de la carta de garantía
								 */
								if (mObjCartaGarantia.match(mStrAnio + '.*')) {
									mStrCartaGarantia	= mObjCartaGarantia.substr(4,mIntLength);
									mIntLength			-= 4;
									if (mIntLength < 6) {
										for (let i = mIntLength; i < 6; i++) {
											mStrAddCero += "0";
										}
									}
									mObjCartaGarantia = mStrAnio.substr(2,4) + mStrAddCero + mStrCartaGarantia;
								} else if (mObjCartaGarantia.match(mStrAnio.substr(2,4) + '.*')) {
									mStrCartaGarantia = mObjCartaGarantia.substr(2,mIntLength);
									mIntLength -= 2;
									if (mIntLength < 6) {
										for (let i = mIntLength; i < 6; i++) {
											mStrAddCero += "0";
										}
									}
									mObjCartaGarantia = mStrAnio.substr(2,4) + mStrAddCero + mStrCartaGarantia;
								} else {
									if (mIntLength < 6) {
										for (let i = mIntLength; i < 6; i++) {
											mStrAddCero	+= "0";
										}
									}
									mObjCartaGarantia = mStrAnio.substr(2,4) + mStrAddCero + mObjCartaGarantia;
								}

								// Asignamos los valores a insertar en la tabla
								row.aut_tipo	= '03';
								row.aut_numero	= mObjCartaGarantia;
							}
						}

						// Si es RIMAC, se aplican las siguientes reglas
						else if (row.fvh_financiador == '00041343' || row.fvh_financiador == '00043258') {
							if (row.aut_codigo_acc) {
								mStrDeclaraAccidente = row.aut_codigo_acc.split("-")[0].trim() + (row.aut_codigo_acc.split("-")[1] || '').trim();
							}
							let mStrNumeroAut = row.aut_numero;

							/**
							 * SCTR (RIMAC EPS y codigo prod = 'R')
							 *	 Si existe carta garantía:
							 *		Documento 1: [07] Declaración de accidente
							 *		Documento 2: [03] Carta garantía
							 *
							 *	 Si NO existe carta garantía:
							 *		Documento 1: [07] Declaración de accidente
							 *		Documento 2: [99] No aplica
							 */
							if (row.fvh_financiador == '00043258' && row.aut_codigo_prod == 'R') {
								// EXISTE CARTA GARANTÍA
								if (mObjCartaGarantia) {
									// Documento 1: [07] Declaración de accidente
									row.aut_tipo	= '07';
									row.aut_numero	= mStrDeclaraAccidente;

									// Documento 2: [03] Carta garantía
									mStrTipoDoc	= '03';
									mStrNroDoc	= mObjCartaGarantia;
								}
								// NO EXISTE CARTA GARANTÍA
								else {
									// Documento 1: [07] Declaración de accidente
									row.aut_tipo	= '07';
									row.aut_numero	= mStrDeclaraAccidente;

									// Documento 2: [99] NO APLICA
									mStrTipoDoc	= '99';
									mStrNroDoc	= '';
								}
							}

								/**
								 *	Si el producto es ACCIDENTE ESTUDIANTE:
								 *	Si existe carta garantía:
								 *		Documento 1: [07] Declaración de accidente
								 *		Documento 2: [03] Carta garantía
								 *
								 *	Si NO existe carta garantía:
								 *		Documento 1: [07] Declaración de accidente
								 *		Documento 2: [01] Autorización SITEDS
								 */
								else if (row.fvh_financiador == '00041343' && (row.aut_codigo_prod == 'E1' || row.aut_codigo_prod == 'E2')) {
									// EXISTE CARTA GARANTÍA
									if (mObjCartaGarantia) {
										// Documento 1: [07] Declaración de accidente
										row.aut_tipo	= '07';
										row.aut_numero	= mStrDeclaraAccidente;

										// Documento 2: [03] Carta garantía
										mStrTipoDoc	= '03';
										mStrNroDoc	= mObjCartaGarantia;
									}
									// NO EXISTE CARTA GARANTÍA
									else {
										// Documento 1: [07] Declaración de accidente
										row.aut_tipo	= '07';
										row.aut_numero	= mStrDeclaraAccidente;

										// Documento 2: [01] Autorización SITEDS
										mStrTipoDoc	= '01';
										mStrNroDoc	= mStrNumeroAut;
									}
								}

							/**
							 *	Si es OTRO producto
							 *	Si existe carta garantía:
							 *		Documento 1: [01] Autorización SITEDS
							 *		Documento 2: [03] Carta garantía
							 *
							 *	Si NO existe carta garantía:
							 *		Documento 1: [01] Autorización SITEDS
							 *		Documento 2: [99] No aplica
							 */
							else {
								// EXISTE CARTA GARANTÍA
								if (mObjCartaGarantia) {
									// Documento 1: [01] Autorización SITEDS
									row.aut_tipo	= '01';
									row.aut_numero	= mStrNumeroAut;

									// Documento 2: [03] Carta garantía
									mStrTipoDoc	= '03';
									mStrNroDoc	= mObjCartaGarantia;
								}
								// NO EXISTE CARTA GARANTÍA
								else {
									// Documento 1: [01] Autorización SITEDS
									row.aut_tipo	= '01';
									row.aut_numero	= mStrNumeroAut;

									// Documento 2: [99] No aplica
									mStrTipoDoc	= '99';
									mStrNroDoc	= '';
								}
							}
						} else {
							if (mObjCartaGarantia) {
								/**
								 * - Si tipo de carta es SITEDS ('03'), tipo documento es '01'
								 * - Si tipo de carta no es SITEDS ('03'), tipo documento es '03'
								*/
								mStrTipoDoc	= mArrCartaGarantia.acg_tipo == '03' ? '01' : '03';
								mStrNroDoc	= mObjCartaGarantia;
							} else {
								mStrTipoDoc	= '99';
								mStrNroDoc	= null;
							}
						}

						/**
						 * Si el ámbito es diferente a Hospitalario, regresamos el valor inicial
						 * al primer tipo de documento
						 */
						/*if (row.amg_codigo != 'H') {
							row.aut_tipo = mStrTipoPrimerDoc;
						}*/

						// Recuperación de FECHA Y HORA de la admisión 
						let mDateFec = mDateFecTemp.format('dd-MM-yyyy');
						let mDateHor = mDateFecTemp.format('HH:mm:ss');

						// Secuenciadores por facturas y liquidaciones
						if (mStrEpPadre == '') {
							mStrEpPadre = mRowData.adm_episodio_padre;
							mCountFichAte ++;
						} else if (mStrLiq_ate != mRowData.liq_id) {
							mStrLiq_ate = mRowData.liq_id
							mCountFichAte ++;
						}

						if (mStrFact_ate != row.fvh_numero) {
							mCountFichAte	= 1;
							mStrFact_ate	= row.fvh_numero;
							mStrEpPadre		= '';
						}

						/**
						 * Suma de los copagos fijo y exonerados obtenidos de
						 * las tablas dserv y dfarm
						 */
						let mRsCopagoServ = Ax.db.executeQuery(`
							<select>
								<columns>
									SUM(tdserv_cpgvarproc)	tdserv_cpgvarproc,
									SUM(tdserv_cpgvr_round)	tdserv_cpgvr_round,
									SUM(tdserv_cpgfjproc)	tdserv_cpgfjproc,
									SUM(tdserv_cpgfj_round)	tdserv_cpgfj_round,
									tdserv_servexeimp
								</columns>
								<from table = 'fas_tedef_dserv_test' />
								<where>
										tdserv_nrodocpg = ?
									AND tdserv_pres 	= ?
									AND tdserv_nrolote	= ?
								</where>
								<group>
									tdserv_servexeimp
								</group>
							</select>
						`, mRowData.fvh_numero, mCountFichAte, mRowData.tdf_nrolote);

						let mRsCopagoFarm = Ax.db.executeQuery(`
							<select>
								<columns>
									SUM(tdfarm_cpgprdfarm)	 tdfarm_cpgprdfarm,
									SUM(tdfarm_cpgprd_round) tdfarm_cpgprd_round,
									tdfarm_prdexeifv
								</columns>
								<from table = 'fas_tedef_dfarm_test' />
								<where>
										tdfarm_nrodocpg	= ?
									AND tdfarm_pres		= ?
									AND tdfarm_nrolote	= ?
								</where>
								<group>
									tdfarm_prdexeifv
								</group>
							</select>
						`, mRowData.fvh_numero, mCountFichAte, mRowData.tdf_nrolote);

						// obtención de los copagos de los productos y servicios
						let mRsFarmLineas = Ax.db.executeQuery(`
							<select>
								<columns>
									tdfarm_serial,
									tdfarm_prdexeifv,
									tdfarm_cpgprd_round
								</columns>
								<from table = 'fas_tedef_dfarm_test' />
								<where>
										tdfarm_nrodocpg	= ?
									AND tdfarm_pres		= ?
									AND tdfarm_nrolote	= ?
								</where>
							</select>
						`, mRowData.fvh_numero, mCountFichAte, mRowData.tdf_nrolote).toMemory();

						let mRsServLineas = Ax.db.executeQuery(`
							<select>
								<columns>
									tdserv_serial,
									tdserv_servexeimp,
									tdserv_cpgfj_round,
									tdserv_cpgvr_round
								</columns>
								<from table = 'fas_tedef_dserv_test' />
								<where>
										tdserv_nrodocpg	= ?
									AND tdserv_pres		= ?
									AND tdserv_nrolote	= ?
								</where>
							</select>
						`, mRowData.fvh_numero, mCountFichAte, mRowData.tdf_nrolote).toMemory();

						// Verificación si es IGV o EXONERADO
						mRsCopagoServ.forEach((mRowCpServ) => {
							if (mRowCpServ.tdserv_servexeimp == 'IGV') {
								mBcCpVrIgvRound	= Ax.math.bc.add(mBcCpVrIgvRound, mRowCpServ.tdserv_cpgvr_round);
								covigv			= Ax.math.bc.add(covigv, mRowCpServ.tdserv_cpgvarproc);
								mBcCpFjIgvRound	= Ax.math.bc.add(mBcCpFjIgvRound, mRowCpServ.tdserv_cpgfj_round);
								cofigv			= Ax.math.bc.add(cofigv, mRowCpServ.tdserv_cpgfjproc);
							} else if (mRowCpServ.tdserv_servexeimp == 'EXONERADO') {
								mBcCpVrExoRound	= Ax.math.bc.add(mBcCpVrExoRound, mRowCpServ.tdserv_cpgvr_round);
								covexo			= Ax.math.bc.add(covexo, mRowCpServ.tdserv_cpgvarproc);
								mBcCpFjExoRound	= Ax.math.bc.add(mBcCpFjExoRound, mRowCpServ.tdserv_cpgfj_round);
								cofexo			= Ax.math.bc.add(cofexo, mRowCpServ.tdserv_cpgfjproc);
							}
						});
						mRsCopagoServ.close();

						mRsCopagoFarm.forEach((mRowCpFarm) => {
							if (mRowCpFarm.tdfarm_prdexeifv == 'IGV') {
								mBcCpVrIgvRound	= Ax.math.bc.add(mBcCpVrIgvRound, mRowCpFarm.tdfarm_cpgprd_round);
								covigv			= Ax.math.bc.add(covigv, mRowCpFarm.tdfarm_cpgprdfarm);
							} else if (mRowCpFarm.tdfarm_prdexeifv == 'EXONERADO') {
								mBcCpVrExoRound	= Ax.math.bc.add(mBcCpVrExoRound, mRowCpFarm.tdfarm_cpgprd_round);
								covexo			= Ax.math.bc.add(covexo, mRowCpFarm.tdfarm_cpgprdfarm);
							}
						});
						mRsCopagoFarm.close();

						// cofigv = obtenerImporteRedondeado(cofigv);
						// cofexo = obtenerImporteRedondeado(cofexo);
						// covigv = obtenerImporteRedondeado(covigv);
						// covexo = obtenerImporteRedondeado(covexo);

                        // if(mRowData.fvh_numero == 'F418-00003746' || mRowData.fvh_numero == 'F418-00003622'){
                        //     console.log(mRowData.fvh_numero)
                        //     console.log('cofigv:', cofigv);
                        //     console.log('cofexo:', cofexo);
                        //     console.log('covigv:', covigv);
                        //     console.log('covexo:', covexo);
                        // }
                        
						cofigv = Ax.math.bc.of(cofigv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
						cofexo = Ax.math.bc.of(cofexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
						covigv = Ax.math.bc.of(covigv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
						covexo = Ax.math.bc.of(covexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);

						// Verificación si existen servicios sobre la factura
						if (mRsServLineas.getRowCount() != 0) {

							// Verificación de los copagos fijos y variables / afectos e inafectos
							if (cofigv.compareTo(mBcCpFjIgvRound) != 0) {
								mBcDifCpFjIgv	= Ax.math.bc.sub(cofigv, mBcCpFjIgvRound)
							}

							if (cofexo.compareTo(mBcCpFjExoRound) != 0) {
								mBcDifCpFjExo	= Ax.math.bc.sub(cofexo, mBcCpFjExoRound)
							}

							if (covigv.compareTo(mBcCpVrIgvRound) != 0) {
								mBcDifCpVrIgv	= Ax.math.bc.sub(covigv, mBcCpVrIgvRound)
							}

							if (covexo.compareTo(mBcCpVrExoRound) != 0) {
								mBcDifCpVrExo	= Ax.math.bc.sub(covexo, mBcCpVrExoRound)
							}

							/**
							 * Recorrido de las lineas para ajustar los montos, si existe desigualdad, se ajustará el monto
							 * a su vez, verifica si el copago a modificar tiene un monto informado, de ser 0.00 pasa a la
							 * siguiente linea para ajustar el monto
							 */
							mRsServLineas.forEach((mRowServLineas) => {
								// Verificación del Copago Fijo afecto a IGV
								if (mBcDifCpFjIgv < 0.00 && mRowServLineas.tdserv_servexeimp == 'IGV') {
									if (mRowServLineas.tdserv_cpgfj_round > 0.00) {
										mRowServLineas.tdserv_cpgfj_round = Ax.math.bc.sub(mRowServLineas.tdserv_cpgfj_round, 0.01);
										mBcDifCpFjIgv = Ax.math.bc.add(mBcDifCpFjIgv, 0.01);
										if (mBcDifCpFjIgv > 0.00) {
											mBcDifCpFjIgv = 0.00
										}
									}
								} else if (mBcDifCpFjIgv > 0.00 && mRowServLineas.tdserv_servexeimp == 'IGV') {
									if (mRowServLineas.tdserv_cpgfj_round > 0.00) {
										mRowServLineas.tdserv_cpgfj_round = Ax.math.bc.add(mRowServLineas.tdserv_cpgfj_round, 0.01)
										mBcDifCpFjIgv = Ax.math.bc.sub(mBcDifCpFjIgv, 0.01)
										if (mBcDifCpFjIgv < 0.00) {
											mBcDifCpFjIgv = 0.00
										}
									}
								}

								// Verificación del Copago Variable afecto a IGV
								if (mBcDifCpVrIgv < 0.00 && mRowServLineas.tdserv_servexeimp == 'IGV') {
									if (mRowServLineas.tdserv_cpgvr_round > 0.00) {
										mRowServLineas.tdserv_cpgvr_round = Ax.math.bc.sub(mRowServLineas.tdserv_cpgvr_round, 0.01);
										mBcDifCpVrIgv = Ax.math.bc.add(mBcDifCpVrIgv, 0.01);
										if (mBcDifCpVrIgv > 0.00) {
											mBcDifCpVrIgv = 0.00
										}
									}
								} else if (mBcDifCpVrIgv > 0.00 && mRowServLineas.tdserv_servexeimp == 'IGV') {
									if (mRowServLineas.tdserv_cpgvr_round > 0.00) {
										mRowServLineas.tdserv_cpgvr_round = Ax.math.bc.add(mRowServLineas.tdserv_cpgvr_round, 0.01)
										mBcDifCpVrIgv = Ax.math.bc.sub(mBcDifCpVrIgv, 0.01)
										if (mBcDifCpVrIgv < 0.00) {
											mBcDifCpVrIgv = 0.00
										}
									}
								}

								// Actualización del copago fijo y variable afecto a IGV
								Ax.db.update('fas_tedef_dserv_test',
									{
										"tdserv_cpgfj_round"	: mRowServLineas.tdserv_cpgfj_round,
										"tdserv_cpgvr_round"	: mRowServLineas.tdserv_cpgvr_round
									},
									{
										"tdserv_serial"			: mRowServLineas.tdserv_serial
									}
								);

								// Verificación del Copago Fijo Exonerado a IGV
								if (mBcDifCpFjExo < 0.00 && mRowServLineas.tdserv_servexeimp == 'EXONERADO') {
									if (mRowServLineas.tdserv_cpgfj_round > 0.00) {
										mRowServLineas.tdserv_cpgfj_round = Ax.math.bc.sub(mRowServLineas.tdserv_cpgfj_round, 0.01);
										mBcDifCpFjExo = Ax.math.bc.add(mBcDifCpFjExo, 0.01);
										if (mBcDifCpFjExo > 0.00) {
											mBcDifCpFjExo = 0.00
										}
									}
								} else if (mBcDifCpFjExo > 0.00 && mRowServLineas.tdserv_servexeimp == 'EXONERADO') {
									if (mRowServLineas.tdserv_cpgfj_round > 0.00) {
										mRowServLineas.tdserv_cpgfj_round = Ax.math.bc.add(mRowServLineas.tdserv_cpgfj_round, 0.01)
										mBcDifCpFjExo = Ax.math.bc.sub(mBcDifCpFjExo, 0.01)
										if (mBcDifCpFjExo < 0.00) {
											mBcDifCpFjExo = 0.00
										}
									}
								}

								// Verificación del Copago Variable Exonerado a IGV
								if (mBcDifCpVrExo < 0.00 && mRowServLineas.tdserv_servexeimp == 'EXONERADO') {
									if (mRowServLineas.tdserv_cpgvr_round > 0.00) {
										mRowServLineas.tdserv_cpgvr_round = Ax.math.bc.sub(mRowServLineas.tdserv_cpgvr_round, 0.01);
										mBcDifCpVrExo = Ax.math.bc.add(mBcDifCpVrExo, 0.01);
										if (mBcDifCpVrExo > 0.00) {
											mBcDifCpVrExo = 0.00
										}
									}
								} else if (mBcDifCpVrExo > 0.00 && mRowServLineas.tdserv_servexeimp == 'EXONERADO') {
									if (mRowServLineas.tdserv_cpgvr_round > 0.00) {
										mRowServLineas.tdserv_cpgvr_round = Ax.math.bc.add(mRowServLineas.tdserv_cpgvr_round, 0.01)
										mBcDifCpVrExo = Ax.math.bc.sub(mBcDifCpVrExo, 0.01)
										if (mBcDifCpVrExo < 0.00) {
											mBcDifCpVrExo = 0.00
										}
									}
								}

								// Actualización del copago fijo y variable Exonerado a IGV
								Ax.db.update('fas_tedef_dserv_test',
									{
										"tdserv_cpgfj_round"	: mRowServLineas.tdserv_cpgfj_round,
										"tdserv_cpgvr_round"	: mRowServLineas.tdserv_cpgvr_round
									},
									{
										"tdserv_serial"			: mRowServLineas.tdserv_serial,
										"tdserv_servexeimp"		: "EXONERADO"
									}
								);

							});
							mRsServLineas.close();

							// Verificación si existen lineas informadas de farmacia por factura
						} else if (mRsFarmLineas.getRowCount() != 0) {

							if (covigv.compareTo(mBcCpVrIgvRound) != 0) {
								mBcDifCpVrIgv	= Ax.math.bc.sub(covigv, mBcCpVrIgvRound)
							}

							if (covexo.compareTo(mBcCpVrExoRound) != 0) {
								mBcDifCpVrExo	= Ax.math.bc.sub(covexo, mBcCpVrExoRound)
							}

							mRsFarmLineas.forEach((mRowFarmLineas) => {

								if (mBcDifCpFjIgv < 0.00 && mRowFarmLineas.tdfarm_prdexeifv == 'IGV') {
									if (mRowFarmLineas.tdfarm_cpgprd_round > 0.00) {
										mRowFarmLineas.tdfarm_cpgprd_round = Ax.math.bc.sub(mRowFarmLineas.tdfarm_cpgprd_round, 0.01);
										mBcDifCpFjIgv = Ax.math.bc.add(mBcDifCpFjIgv, 0.01);
										if (mBcDifCpFjIgv > 0.00) {
											mBcDifCpFjIgv = 0.00
										}
									}
								} else if (mBcDifCpFjIgv > 0.00 && mRowFarmLineas.tdfarm_prdexeifv == 'IGV') {
									if (mRowFarmLineas.tdfarm_cpgprd_round > 0.00) {
										mRowFarmLineas.tdfarm_cpgprd_round = Ax.math.bc.add(mRowFarmLineas.tdfarm_cpgprd_round, 0.01)
										mBcDifCpFjIgv = Ax.math.bc.sub(mBcDifCpFjIgv, 0.01)
										if (mBcDifCpFjIgv < 0.00) {
											mBcDifCpFjIgv = 0.00
										}
									}
								}

								Ax.db.update('fas_tedef_dfarm_test',
									{
										"tdfarm_cpgprd_round"	: mRowFarmLineas.tdfarm_cpgprd_round
									},
									{
										"tdfarm_serial"			: mRowFarmLineas.tdfarm_serial,
										"tdfarm_prdexeifv"		: "IGV"
									}
								);

								if (mBcDifCpVrExo < 0.00 && mRowFarmLineas.tdfarm_prdexeifv == 'EXONERADO') {
									if (mRowFarmLineas.tdfarm_cpgprd_round > 0.00) {
										mRowFarmLineas.tdfarm_cpgprd_round = Ax.math.bc.sub(mRowFarmLineas.tdfarm_cpgprd_round, 0.01);
										mBcDifCpVrExo = Ax.math.bc.add(mBcDifCpVrExo, 0.01);
										if (mBcDifCpVrExo > 0.00) {
											mBcDifCpVrExo = 0.00
										}
									}
								} else if (mBcDifCpVrExo > 0.00 && mRowFarmLineas.tdfarm_prdexeifv == 'EXONERADO') {
									if (mRowFarmLineas.tdfarm_cpgprd_round > 0.00) {
										mRowFarmLineas.tdfarm_cpgprd_round = Ax.math.bc.add(mRowFarmLineas.tdfarm_cpgprd_round, 0.01)
										mBcDifCpVrExo = Ax.math.bc.sub(mBcDifCpVrExo, 0.01)
										if (mBcDifCpVrExo < 0.00) {
											mBcDifCpVrExo = 0.00
										}
									}
								}

								Ax.db.update('fas_tedef_dfarm_test',
									{
										"tdfarm_cpgprd_round"	: mRowFarmLineas.tdfarm_cpgprd_round
									},
									{
										"tdfarm_serial"			: mRowFarmLineas.tdfarm_serial,
										"tdfarm_prdexeifv"		: "EXONERADO"
									}
								);
							})
							mRsFarmLineas.close();
						}

						/**
						 * Si es el financiador Sistemas Alternativos, se añaden
						 * los guiones requerido por el financiador
						 */
						if (row.fvh_financiador == '00057581' || row.fvh_financiador == '00041463' || row.fvh_financiador == '00057437' || row.fvh_financiador == '00057146') {
							let codAfiliado	= row.aut_afiliado_numero;
							let mStrCod1	= codAfiliado.substring(2,0);
							let mStrCod2	= codAfiliado.substring(2,8);
							let mStrCod3	= codAfiliado.substring(8,10);
								row.aut_afiliado_numero = mStrCod1 + '-' + mStrCod2 + '-' + mStrCod3;
						}

						// Obtención de la data del paciente en base al episodio
						let mObjDatosPaciente = Ax.db.executeQuery(`
							<select>
								<columns>
									pac_tipo_documento,
									pac_numero_documento,
									pac_edad
								</columns>
								<from table='fas_admision'>
									<join table='fas_paciente'>
										<on>fas_admision.adm_historia_clinica = fas_paciente.pac_historia_clinica</on>
									</join>
								</from>
								<where>
									fas_admision.adm_episodio = ?
								</where>
							</select>
						`, mRowData.liq_episodio).toOne()

						row.aut_tipo_documento_tit		= mObjDatosPaciente.pac_tipo_documento;
						row.aut_numero_documento_tit	= mObjDatosPaciente.pac_numero_documento;

                        /**
                         * covigv: Suma de copagos farmacia y atenciones
                        */
                        let mDiffCopago = Ax.math.bc.sub(covigv, row.liql_importe_neto_coa_pp).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
                        // let mDiffCopago = Ax.math.bc.sub(covigv, 8.55).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
                        if(mDiffCopago > 0.00 || mDiffCopago < 0.00){
                            console.log('fact', row.fvh_numero);
                            console.log('covigv', covigv, 'row', row.liql_importe_neto_coa_pp);
                            console.log('mDiffCopago', mDiffCopago);
                            covigv = ajusteDiferenciaFarmAte(row.tdf_nrolote, row.fvh_numero, mCountFichAte, mDiffCopago, covigv);
                            console.log('luego_ajuste', covigv);
                            // let xyzcovigv = ajusteDiferenciaFarmAte(row.tdf_nrolote, row.fvh_numero, mCountFichAte, mDiffCopago, covigv);
                            // console.log('luego_ajuste', xyzcovigv);
                        }
                        
						// Insert en fas_tedef_date_test 
						mIntSerialDate = Ax.db.insert('fas_tedef_date_test',
							{
								"tdate_nrolote"			: row.tdf_nrolote,
								"tdate_ruc"				: row.emp_nif,
								"tdate_ipress"			: row.cen_refaux1,
								"tdate_tipodocpg"		: row.fvt_refaux1,
								"tdate_nrodocpg"		: row.fvh_numero,
								"tdate_centro"			: mStrCentro,
								"tdate_pres"			: mCountFichAte,
								"tdate_codint"			: row.aut_cobertura,
								"tdate_tipoafi"			: row.aut_tipo_prod,
								"tdate_codaseg"			: row.aut_afiliado_numero,
								"tdate_tipodoc"			: row.aut_tipo_documento_tit,
								"tdate_nrodoc"			: row.aut_numero_documento_tit,
								"tdate_nrohstcli"		: row.adm_historia_clinica,
								"tdate_docautpres"		: row.aut_tipo,
								"tdate_nrodocaut"		: row.aut_numero,
								"tdate_segdocaut"		: mStrTipoDoc,
								"tdate_segnrodoc"		: mStrNroDoc,
								"tdate_tipcob"			: row.cob_tipo,
								"tdate_subtipcob"		: row.cob_auxchr1,
								"tdate_prmdiag"			: mStrDiag1,
								"tdate_segdiag"			: mStrDiag2,
								"tdate_trcdiag"			: mStrDiag3,
								"tdate_fecpres"			: mDateFec,
								"tdate_horapres"		: mDateHor,
								"tdate_tipprof"			: mStrTipCod,
								"tdate_nrocoleg"		: row.med_colegiatura,
								"tdate_tipdocmed"		: mStrTipDoc,
								"tdate_nrodocmed"		: row.med_documento,
								"tdate_rucref"			: row.emp_nif,
								"tdate_fectrans"		: "",
								"tdate_horatrans"		: "",
								"tdate_tiphosp"			: mStrTipoInter,
								"tdate_fecinghosp"		: mStrFechaIngr,
								"tdate_fecegrhosp"		: mStrFechaEgre,
								"tdate_tipegrhosp"		: mStrMotivoAlt,
								"tdate_diasfactu"		: mStrDiasEstim,
								"tdate_honoproexo"		: 0.00,
								"tdate_procdenexo"		: 0.00,
								"tdate_preshsctexo"		: 0.00,
								"tdate_exaauxexo"		: 0.00,
								"tdate_exaauximg"		: 0.00,
								"tdate_farmexo"			: 0.00,
								"tdate_protexo"			: 0.00,
								"tdate_prdsemedexo"		: 0.00,
								"tdate_pressalexo"		: 0.00,
								"tdate_cpgfijaf"		: cofigv,
								"tdate_cpgfijaf_round"	: Ax.math.bc.of(cofigv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
								"tdate_cpgfijexo"		: cofexo,
								"tdate_cpgfijexo_round"	: Ax.math.bc.of(cofexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
								"tdate_cpgvaraf"		: covigv,
								"tdate_cpgvaraf_round"	: Ax.math.bc.of(covigv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
								"tdate_cpgvarexo"		: covexo,
								"tdate_cpgvarexo_round"	: Ax.math.bc.of(covexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
								"tdate_totgstcub"		: 0.00,
								"tdate_totgstcub_round"	: 0.00
							}
						).getSerial();

						// Proteccion para no insertar vacíos en la tabla Date
						if (mStrFactDate != row.fvh_numero) {

							/**
							 * Busqueda de las prestaciones con sus montos
							 * por factura como criterio de busqueda
							 */
							let mRsDatosServ = Ax.db.executeQuery(`
								<select>
									<columns>
										DISTINCT
										fas_liquidacion_linea.liq_id,
										fas_liquidacion_linea.liql_id,
										fas_tedef_dserv_test.tdserv_mntprocserv liql_importe_neto,
										fas_liquidacion_linea.liql_precio_fac,
										fas_liquidacion_linea.liql_cubierto,
										fas_liquidacion_linea.liql_impuesto,
										fas_liquidacion_linea.liql_cantidad,
										fas_liquidacion_linea.liql_estado,
										NVL(fas_prestacion.pre_grupo_contable,'6') pre_grupo_contable,
										fas_liquidacion_impuesto.liqi_impuesto,
										fas_liquidacion_impuesto.liqi_importe_ded,
										fas_liquidacion_impuesto.liqi_importe_dif_cuarto,
										CASE WHEN acp_origen_app = 'C3 - emergencia'
											THEN 2
											ELSE 1
										END serv_correlativo,
										CASE WHEN liql_cubierto = 0
											THEN 0
											ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
														THEN ((fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) * liql_cantidad) * (1 - liql_factor_coa / 100)
														ELSE (fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) - <nvl>liql_importe_neto_coa,0</nvl>
													END
										END liql_importe_neto_coa_pp
									</columns> 
										<from table = 'fas_tedef_factura'>
											<join table='fas_factura_venta'>
												<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
												<join table='fas_factura_venta_linea'>
													<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
													<join table='fas_factura_venta_enlace' >
														<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
														<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
														<join table = 'fas_liquidacion'>
															<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
															<join table='fas_liquidacion_linea'>
																<on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
																<join table='fas_prestacion'>
																	<on>fas_liquidacion_linea.liql_presta_fact = fas_prestacion.pre_codigo</on>
																</join>
																<join table = 'fas_tedef_dserv_test'>
																	<on>fas_tedef_factura.tdf_factura = fas_tedef_dserv_test.tdserv_nrodocpg</on>
																	<on>fas_tedef_factura.tdf_nrolote = fas_tedef_dserv_test.tdserv_nrolote</on>
																	<on>fas_liquidacion_linea.liql_id = fas_tedef_dserv_test.tdserv_liql_id</on>
																</join>
																<join table='fas_actividad_pres'>
																	<on>fas_liquidacion_linea.acp_id = fas_actividad_pres.acp_id</on>
																</join>
															</join>
															<join table='fas_liquidacion_impuesto'>
																<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
																<on>fas_liquidacion_impuesto.liqi_impuesto = fas_factura_venta_linea.fvl_impuesto</on>
															</join>
														</join>
													</join>
												</join>
											</join>
										</from>
									<where>
											fas_tedef_factura.tdf_nrolote = ?
										AND fas_tedef_factura.tdf_factura = ?
										AND ${mStrSqlCond}
										AND fas_liquidacion_linea.liq_id = ?
										AND fas_tedef_dserv_test.tdserv_pres = ?
										AND fas_liquidacion_linea.acp_id IS NOT NULL
										AND fas_liquidacion_linea.liql_estado IN ('P','F','Q')
                                        ${mStrCondFact}
									</where>
									<order>
										serv_correlativo
									</order>
								</select>
							`, mRowData.tdf_nrolote, mRowData.fvh_numero, mRowData.liq_id, mCountFichAte).toMemory();

							/**
							 * Si tenemos servicion de tipo paquete
							 * Se eliminan las lineas con estado "F"
							 */
							let mArrEst = []
								mRsDatosServ.rows().groupBy("liql_estado").forEach(e => mArrEst.push(e))

							if (mArrEst.includes('F'&&'Q')) {
								mRsDatosServ = mRsDatosServ.rows().select(e => e.getString("liql_estado") === 'Q');
							}

							/**
							 * Busqueda de los productos con sus montos
							 * por factura como criterio de busqueda
							 */
							let mRsDatosProd = Ax.db.executeQuery(`
								<select>
									<columns>
										DISTINCT
										fas_liquidacion_linea.liq_id,
										fas_liquidacion_linea.liql_id,
										(fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) liql_importe_neto,
										fas_liquidacion_linea.liql_presta_fact,
										fas_liquidacion_linea.liql_precio_fac,
										fas_liquidacion_linea.liql_cubierto,
										fas_liquidacion_linea.liql_impuesto,
										fas_liquidacion_linea.liql_cantidad,
										'6' pre_grupo_contable,
										fas_liquidacion_impuesto.liqi_impuesto,
										fas_liquidacion_impuesto.liqi_importe_ded,
										fas_liquidacion_impuesto.liqi_importe_dif_cuarto,
										CASE WHEN liql_cubierto = 0
											THEN 0
											ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
														THEN ((fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) * liql_cantidad) * (1 - liql_factor_coa / 100)
														ELSE (fas_liquidacion_linea.liql_importe_neto - <nvl>fas_liquidacion_linea.liql_importe_dif_cuarto, 0.00</nvl>) - <nvl>liql_importe_neto_coa,0</nvl>
													END
										END liql_importe_neto_coa_pp
									</columns>
									<from table = 'fas_tedef_factura'>
										<join table='fas_factura_venta'>
											<on>fas_tedef_factura.tdf_factura = fas_factura_venta.fvh_numero</on>
											<join table='fas_factura_venta_linea'>
												<on>fas_factura_venta.fvh_id = fas_factura_venta_linea.fvh_id</on>
												<join table='fas_factura_venta_enlace' >
													<on>fas_factura_venta_linea.fvl_id = fas_factura_venta_enlace.fvl_id</on>
													<on>fas_factura_venta_linea.fvh_id = fas_factura_venta_enlace.fvh_id</on>
													<join table = 'fas_liquidacion'>
														<on>fas_factura_venta_enlace.liq_id = fas_liquidacion.liq_id</on>
														<join table='fas_liquidacion_linea'>
															<on>fas_liquidacion.liq_id = fas_liquidacion_linea.liq_id</on>
															<join table='fas_producto'>
																<on>fas_liquidacion_linea.liql_presta_fact = fas_producto.prd_codigo</on>
																<join table = 'fas_tedef_dfarm_test'>
																	<on>fas_tedef_factura.tdf_factura = fas_tedef_dfarm_test.tdfarm_nrodocpg</on>
																	<on>fas_tedef_factura.tdf_nrolote = fas_tedef_dfarm_test.tdfarm_nrolote</on>
																	<on>fas_liquidacion_linea.liql_id = fas_tedef_dfarm_test.tdfarm_liql_id</on>
																</join>
															</join>
															<join table='fas_actividad_prod'>
																<on>fas_liquidacion_linea.acd_id = fas_actividad_prod.acd_id</on>
															</join>
														</join>
														<join table='fas_liquidacion_impuesto'>
															<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
															<on>fas_liquidacion_impuesto.liqi_impuesto = fas_factura_venta_linea.fvl_impuesto</on>
														</join>
													</join>
												</join>
											</join>
										</join>
									</from>
									<where>
											fas_tedef_factura.tdf_nrolote = ?
										AND fas_tedef_factura.tdf_factura = ?
										AND ${mStrSqlCond}
										AND fas_liquidacion_linea.liq_id = ?
										AND fas_tedef_dfarm_test.tdfarm_pres = ?
										AND fas_liquidacion_linea.acd_id IS NOT NULL
										AND fas_liquidacion_linea.liql_estado IN ('P','F','Q')
                                        ${mStrCondFact}
									</where>
								</select>
							`, mRowData.tdf_nrolote, mRowData.fvh_numero, mRowData.liq_id, mCountFichAte).toMemory();

							/**
							 * Declaracion de las variables para los montos cubiertos
							 * en las prestaciones, productos y sumatoria final
							 */
							let sumFinal	= 0.00;
							let preCub1		= 0.00;
							let preCub2		= 0.00;
							let preCub3		= 0.00;
							let preCub4		= 0.00;
							let preCub5		= 0.00;
							let preCub6		= 0.00;
							let preCub7		= 0.00;
							let preCub8		= 0.00;
							let preCub9		= 0.00;
							let preCub10	= 0.00;
							let preCub11	= 0.00;

							let prdCub1		= 0.00;
							let prdCub2		= 0.00;
							let prdCub3		= 0.00;
							let prdCub4		= 0.00;
							let prdCub5		= 0.00;
							let prdCub6		= 0.00;
							let prdCub7		= 0.00;
							let prdCub8		= 0.00;
							let prdCub9		= 0.00;
							let prdCub10	= 0.00;
							let prdCub11	= 0.00;

							// Recorrido de los servicios obtenidos
							mRsDatosServ.forEach((row) => {
								/**
								 * Protección sobre la cantidad cuando es 0, ya que posteriormente se divide
								 * el importe neto entre la cantidad
								 */
								if (row.liql_cantidad == 0.00) {
									row.liql_cantidad = 1.00;
								}

								// Obtención del monto unitario y el monto cubierto
								let mDbMontoUnit	= 0.00;
									mDbMontoUnit	= Ax.math.bc.div(row.liql_importe_neto, row.liql_cantidad);
								let mIntCub			= Ax.math.bc.mul(mDbMontoUnit, row.liql_cantidad);

								/**
								 * Recorrido en base al grupo contable para separar los montos
								 * y sumarlos entre cubiertos y no cubiertos
								 */
								switch (row.pre_grupo_contable) {
									case '1' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub1		= preCub1 + mIntCub;
											}
											break;
										}
									case '2' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub2		= preCub2 + mIntCub;
											}
											break;
										}
									case '3' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub3		= preCub3 + mIntCub;
											}
											break;
										}
									case '4' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub4		= preCub4 + mIntCub;
											}
											break;
										}
									case '5' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub5		= preCub5 + mIntCub;
											}
											break;
										}
									case '6' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub6		= preCub6 + mIntCub;
											}
											break;
										}
									case '7' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub7		= preCub7 + mIntCub;
											}
											break;
										}
									case '8' :
										if (row.liql_impuesto == 'EXONERADO') {
											if (row.liql_cubierto == '1') {
												preCub8		= preCub8 + mIntCub;
											}
											break;
										}
									case '9' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												preCub9		= preCub9 + mIntCub;
											}
											break;
										}
								}
								row.liqi_impuesto == 'IGV' ? preCub10 = preCub10 + row.liql_importe_neto_coa_pp : preCub11 = preCub11 + row.liql_importe_neto_coa_pp;
							})
							mRsDatosServ.close();

							// Recorrido de los productos obtenidos
							mRsDatosProd.forEach((row) => {
								/**
								 * Protección sobre la cantidad cuando es 0, ya que posteriormente se divide
								 * el importe neto entre la cantidad
								 */
								if (row.liql_cantidad == 0.00) {
									row.liql_cantidad = 1.00;
								}

								// Obtención del monto unitario y el monto cubierto
								let mDbMontoUnit	= 0.00;
									mDbMontoUnit	= Ax.math.bc.div(row.liql_importe_neto, row.liql_cantidad);
								let mIntCub			= Ax.math.bc.mul(mDbMontoUnit, row.liql_cantidad);

								/**
								 * Recorrido en base al grupo contable para separar los montos
								 * y sumarlos entre cubiertos y no cubiertos
								 */
								switch (row.pre_grupo_contable) {
									case '1' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub1		= prdCub1 + mIntCub;
											}
											break;
										}
									case '2' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub2		= prdCub2 + mIntCub;
											}
											break;
										}
									case '3' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub3		= prdCub3 + mIntCub;
											}
											break;
										}
									case '4' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub4		= prdCub4 + mIntCub;
											}
											break;
										}
									case '5' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub5		= prdCub5 + mIntCub;
											}
											break;
										}
									case '6' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub6		= prdCub6 + mIntCub;
											}
											break;
										}
									case '7' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub7		= prdCub7 + mIntCub;
											}
											break;
										}
									case '8' :
										if (row.liql_impuesto == 'EXONERADO') {
											if (row.liql_cubierto == '1') {
												prdCub8		= prdCub8 + mIntCub;
											}
											break;
										}
									case '9' :
										if (row.liql_impuesto == 'IGV') {
											if (row.liql_cubierto == '1') {
												prdCub9		= prdCub9 + mIntCub;
											}
											break;
										}
								}
								row.liqi_impuesto == 'IGV' ? prdCub10 = prdCub10 +row.liql_importe_neto_coa_pp : prdCub11 = prdCub11 +row.liql_importe_neto_coa_pp;
							})
							mRsDatosProd.close();
							/**
							 * Calculo de los montos para farmacia, productos exonerados
							 * y sumatoria final de los productos y prestaciones cubiertas
							 */
							let mDbMntFarm		= preCub6 + prdCub6;
							let mDbMntProExo	= preCub8 + prdCub8;
								sumFinal		= preCub1 + preCub2 +
												  preCub3 + preCub4 +
												  preCub5 + preCub6 +
												  preCub7 + preCub8 + 
												  preCub9 + prdCub6 +
												  prdCub8;

							// Updateamos fas_tedef_date_test con los montos obtenidos
							let mObjTedef_date =
								{
									"tdate_honoproexo"		: preCub1,
									"tdate_procdenexo"		: preCub2,
									"tdate_preshsctexo"		: preCub3,
									"tdate_exaauxexo"		: preCub4,
									"tdate_exaauximg"		: preCub5,
									"tdate_farmexo"			: mDbMntFarm,
									"tdate_protexo"			: preCub7,
									"tdate_prdsemedexo"		: mDbMntProExo,
									"tdate_pressalexo"		: preCub9,
									"tdate_totgstcub"		: sumFinal,
									"tdate_totgstcub_round"	: Ax.math.bc.of(sumFinal).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)
								}

							Ax.db.update('fas_tedef_date_test',
								mObjTedef_date,
								{
									"tdate_serial"		: mIntSerialDate
								}
							);
						}
					} catch(e) {
						console.error('DATE:', e)
						/**
						 * Almacenamiento de las facturas que tienen algún error al updaterar
						 */
						mStrFactDate = row.fvh_numero;
						mStrFacturas = mStrFacturas + row.fvh_numero + " ";
						contador ++;
					}
				});
				mRsDate.close();
			}/* else {
				// Si faltan datos, se muestra el siguiente mensaje, indicando el lote
				throw new Error ("Faltan datos para el lote: " + mRowData.tdf_nrolote)
			}*/
		}
    });
    mRsInicial.close();

    console.timeEnd('INICIO DE ARMADO');
    let mDateFecPrePac;

    /**
     * Actualizacion en dfac en base a dserv, defarm y date
    */
    let mRsDfac = Ax.db.executeQuery(`
        <select>
            <columns>
                fas_tedef_dfac_test.tdfac_serial,
                fas_tedef_dfac_test.tdfac_lote,
                fas_factura_venta.fvh_numero,
                fas_tedef_dfac_test.tdfac_mecpag fvh_modo_pago,
                fas_tedef_dfac_test.tdfac_fecprepac,
                fas_tedef_dfac_test.tdfac_mntprepac,
                fas_tedef_dfac_test.tdfac_baseimp
            </columns>
            <from table='fas_tedef_dfac_test'>
                <join table='fas_factura_venta'>
                    <on>fas_tedef_dfac_test.tdfac_nrodocpg = fas_factura_venta.fvh_numero</on>
                </join>
            </from>
            <where>
                tdfac_lote = ?
                ${mStrCondFact}
            </where>
        </select>
    `, mStrLote).toMemory();
    
    console.time('INICIO CUADRE');

    mRsDfac.forEach((mRowDfac) => {

        mDateFecPrePac = null;

        // Si es Paciente mes, la base imponible se obtiene de otra manera
        if (mRowDfac.fvh_modo_pago == 'PACMES') {

        	let mDateFecFacServ			= Ax.db.executeGet(`
        		<select first = '1'>
        			<columns>
        				tdserv_fecproc
        			</columns>
        			<from table = 'fas_tedef_dserv_test' />
        			<where>
        					tdserv_nrolote = ?
        				AND tdserv_nrodocpg = ?
        			</where>
        			<order>
        				tdserv_fecproc
        			</order>
        		</select>
        	`, mRowDfac.tdfac_lote, mRowDfac.fvh_numero);

        	let mDateFecFacFarm	= Ax.db.executeGet(`
        		<select first = '1'>
        			<columns>
        				tdfarm_fecdisfarm
        			</columns>
        			<from table = 'fas_tedef_dfarm_test' />
        			<where>
        					tdfarm_nrolote = ?
        				AND tdfarm_nrodocpg = ?
        			</where>
        			<order>
        				tdfarm_fecdisfarm
        			</order>
        		</select>
        	`, mRowDfac.tdfac_lote, mRowDfac.fvh_numero);

        	let mDateFecServCompare
        	let mDateFecFarmCompare

        	if (!mDateFecFacServ) {
        		mDateFecServCompare = new Ax.util.Date()
        	} else {
        		mDateFecServCompare	= new Ax.util.Date(mDateFecFacServ);
        	}

        	if (!mDateFecFacFarm) {
        		mDateFecFarmCompare = new Ax.util.Date()
        	} else{
        		mDateFecFarmCompare	= new Ax.util.Date(mDateFecFacServ);
        	}

        	let mIntFecDif = mDateFecServCompare.days(mDateFecFarmCompare)
            
        	if (mIntFecDif > 0) {
        		mDateFecPrePac = mDateFecFacServ
        	} else {
        		mDateFecPrePac = mDateFecFacFarm
        	}
        }

        // let mObjMntDfac = Ax.db.executeQuery(`
        //     <select>
        //         <columns>
        //             tdfac_mntprepac,
        //             tdfac_baseimp,
        //             tdfac_montofact,
        //             tdfac_totfact,
        //             tdfac_mecpag fvh_modo_pago
        //         </columns>
        //         <from table = 'fas_tedef_dfac_test' />
        //         <where>
        //                 tdfac_nrodocpg = ?
        //             AND tdfac_lote = ?
        //         </where>
        //     </select>
        // `, mRowDfac.fvh_numero, mRowDfac.tdfac_lote).toOne();

        /**
         * Obtención de la suma total de los copagos de la tabla Date
         * en base a la factura
         */
        let mObjSumDate = Ax.db.executeQuery(`
            <select>
                <columns>
                    SUM(tdate_totgstcub)	tdate_totgstcub,
                    SUM(tdate_cpgfijaf)		tdate_cpgfijaf,
                    SUM(tdate_cpgfijexo)	tdate_cpgfijexo,
                    SUM(tdate_cpgvaraf)		tdate_cpgvaraf,
                    SUM(tdate_cpgvarexo)	tdate_cpgvarexo,
                    SUM(tdate_prdsemedexo)	tdate_prdsemedexo
                </columns>
                <from table = 'fas_tedef_date_test' />
                <where>
                        tdate_nrodocpg = ?
                    AND tdate_nrolote = ?
                </where>
            </select>
        `, mRowDfac.fvh_numero, mRowDfac.tdfac_lote).toOne();

        /**
         * Reglas en base al modo de pago, obtención de la suma del total de gastos cubiertos,
         * cálculo para la base imponible y cálculo para el total facturado
         */
        let mDcSuma			= Ax.math.bc.of(mObjSumDate.tdate_totgstcub);
        let mBcIgv			= 0.00;
        if (mRowDfac.fvh_modo_pago == 'PPS') {
        	mDbBaseImp		= Ax.math.bc.sub(mDcSuma, mObjSumDate.tdate_prdsemedexo, Ax.math.bc.add(mObjSumDate.tdate_cpgfijaf, mObjSumDate.tdate_cpgvaraf));
        	mBcIgv			= Ax.math.bc.mul(mDbBaseImp, 0.18).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
        	mDbTotFac		= Ax.math.bc.sub(Ax.math.bc.add(mDbBaseImp, mBcIgv, mObjSumDate.tdate_prdsemedexo), Ax.math.bc.add(mObjSumDate.tdate_cpgfijexo, mObjSumDate.tdate_cpgvarexo));
        } else {
        	mDbBaseImp		= Ax.math.bc.sub(mRowDfac.tdfac_mntprepac, Ax.math.bc.add(mObjSumDate.tdate_cpgfijaf, mObjSumDate.tdate_cpgvaraf));
        	mBcIgv			= Ax.math.bc.mul(mDbBaseImp, 0.18).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
        	mDbTotFac		= Ax.math.bc.sub(Ax.math.bc.add(mDbBaseImp, mBcIgv), Ax.math.bc.add(mObjSumDate.tdate_cpgfijexo, mObjSumDate.tdate_cpgvarexo));
        }

        // Si la factura es exonerada, se mantiene el importe obtenido (0.00) como IGV
        // if (mObjDfac.fvh_impuesto_val == 0) {
        // 	mBcIgv = mObjDfac.fvh_impuesto_val;
        // }

        // if(mRowDfac.fvh_numero == 'F418-00046085'){
        //     console.log(mRowDfac.fvh_modo_pago);
        //     console.log('mDbBaseImp', mDbBaseImp);
        //     console.log('mBcIgv', mBcIgv);
        //     console.log('mDbTotFac', mDbTotFac);
        // }


        

        // let mBaseImpCalc = Ax.math.bc.sub(mObjMntDfac.tdfac_mntprepac, Ax.math.bc.add(mObjSumDate.tdate_cpgvaraf, mObjSumDate.tdate_cpgfijaf));
        // let mDiffBases = Ax.math.bc.sub(mBaseImpCalc, mObjMntDfac.tdfac_baseimp).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);

        let mBaseImpCalc = mDbBaseImp;
        let mDiffBases = Ax.math.bc.sub(mBaseImpCalc, mRowDfac.tdfac_baseimp).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);


        // let mTotImpCalc = mDbTotFac;
        // let mDiffBases = Ax.math.bc.sub(mTotImpCalc, mObjMntDfac.tdfac_totfact).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);

        let mRsDataDate = Ax.db.executeQuery(`
            <select>
                <columns>
                    tdate_serial,
                    tdate_pres,
                    tdate_cpgvaraf_round,
                    tdate_cpgfijaf_round
                </columns>
                <from table = 'fas_tedef_date_test' />
                <where>
                        tdate_nrodocpg = ?
                    AND tdate_nrolote = ?
                </where>
            </select>
        `, mRowDfac.fvh_numero, mRowDfac.tdfac_lote).toJSONArray();

        // if(mRowDfac.fvh_numero == 'F418-00046085'){
        //     // console.log('mTotImpCalc', mTotImpCalc);
        //     console.log('mBaseImpCalc', mBaseImpCalc);
        //     console.log('BASE_FACT', mObjMntDfac.tdfac_baseimp);
        //     console.log('mDiffBases', mDiffBases);
        //     // console.log('num_atenciones', mRsDataDate.length);
        // }
        let i = 0;
        let mRespDiffBases = 0; // Variable de respaldo para proteccion de bucle infinito
        while(mDiffBases != 0.00 && mRespDiffBases != mDiffBases){
            // console.log('DIFF:', mDiffBases);
            mRespDiffBases = mDiffBases;
            i=0;
            mRsDataDate.forEach(mRowDate => {
                if (mDiffBases > 0.00) {
                    
                    Ax.db.update('fas_tedef_date_test',
                        {
                            "tdate_cpgvaraf_round"	: Ax.math.bc.add(mRowDate.tdate_cpgvaraf_round, 0.01),
                            "tdate_cpgvaraf"		: Ax.math.bc.add(mRowDate.tdate_cpgvaraf_round, 0.01)
                        },
                        {
                            "tdate_serial"			: mRowDate.tdate_serial
                        }
                    );
                    ajusteDiferenciaFarmAte(mRowDfac.tdfac_lote, mRowDfac.fvh_numero, mRowDate.tdate_pres, mDiffBases, mRowDate.tdate_cpgvaraf_round)
                    mDiffBases = Ax.math.bc.sub(mDiffBases, 0.01);

                    mObjSumDate.tdate_cpgvaraf = Ax.math.bc.add(mObjSumDate.tdate_cpgvaraf, 0.01);

                    mRsDataDate[i].tdate_cpgvaraf_round = Ax.math.bc.add(mRowDate.tdate_cpgvaraf_round, 0.01)
                } else if (mDiffBases < 0.00) {

                    if(mRowDate.tdate_cpgvaraf_round > 0.00){
                        Ax.db.update('fas_tedef_date_test',
                            {
                                "tdate_cpgvaraf_round"	: Ax.math.bc.sub(mRowDate.tdate_cpgvaraf_round, 0.01),
                                "tdate_cpgvaraf"		: Ax.math.bc.sub(mRowDate.tdate_cpgvaraf_round, 0.01)
                            },
                            {
                                "tdate_serial"			: mRowDate.tdate_serial
                            }
                        );
                        ajusteDiferenciaFarmAte(mRowDfac.tdfac_lote, mRowDfac.fvh_numero, mRowDate.tdate_pres, mDiffBases, mRowDate.tdate_cpgvaraf_round)
                        mObjSumDate.tdate_cpgvaraf = Ax.math.bc.sub(mObjSumDate.tdate_cpgvaraf, 0.01);
                        mDiffBases = Ax.math.bc.add(mDiffBases, 0.01);

                        mRsDataDate[i].tdate_cpgvaraf_round = Ax.math.bc.sub(mRowDate.tdate_cpgvaraf_round, 0.01)
                    } else if(mRowDate.tdate_cpgfijaf_round > 0.00){
                        
                        Ax.db.update('fas_tedef_date_test',
                            {
                                "tdate_cpgfijaf_round"	: Ax.math.bc.sub(mRowDate.tdate_cpgfijaf_round, 0.01),
                                "tdate_cpgfijaf"		: Ax.math.bc.sub(mRowDate.tdate_cpgfijaf_round, 0.01)
                            },
                            {
                                "tdate_serial"			: mRowDate.tdate_serial
                            }
                        );
                        ajusteDiferenciaFarmAte(mRowDfac.tdfac_lote, mRowDfac.fvh_numero, mRowDate.tdate_pres, mDiffBases, mRowDate.tdate_cpgvaraf_round)
                        mObjSumDate.tdate_cpgfijaf = Ax.math.bc.sub(mObjSumDate.tdate_cpgfijaf, 0.01);
                        mDiffBases = Ax.math.bc.add(mDiffBases, 0.01);

                        mRsDataDate[i].tdate_cpgfijaf_round = Ax.math.bc.sub(mRowDate.tdate_cpgfijaf_round, 0.01)
                    }
                    
                    
                    
                }
                i++;
            });
        }
        // console.log('FIN DIFF:', mDiffBases);


        /**
         * Conteo de la cantidad de prestaciones y productos
         * registrados en la factura
         */
        // let mIntCntAte = Ax.db.executeGet(`
        //     <select>
        //         <columns>
        //             count(*)
        //         </columns>
        //         <from table = 'fas_tedef_date_test' />
        //         <where>
        //                 tdate_nrodocpg = ?
        //             AND tdate_nrolote = ?
        //         </where>
        //     </select>
        // `, mRowDfac.fvh_numero, mRowDfac.tdfac_lote);

        let mIntCntAte = mRsDataDate.length;

        Ax.db.update('fas_tedef_dfac_test',
            {
                "tdfac_cntpres"	        : mIntCntAte,
                "tdfac_fecprepac"       : mDateFecPrePac ? mDateFecPrePac : mRowDfac.tdfac_fecprepac,
                "tdfac_mntexo"			: mObjSumDate.tdate_prdsemedexo,
                "tdfac_totcofjaf"		: mObjSumDate.tdate_cpgfijaf,
                "tdfac_totcofjaf_round"	: Ax.math.bc.of(mObjSumDate.tdate_cpgfijaf).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
                "tdfac_totcofjex"		: mObjSumDate.tdate_cpgfijexo,
                "tdfac_totcofjex_round"	: Ax.math.bc.of(mObjSumDate.tdate_cpgfijexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
                "tdfac_totcovaaf"		: mObjSumDate.tdate_cpgvaraf,
                "tdfac_totcovaaf_round"	: Ax.math.bc.of(mObjSumDate.tdate_cpgvaraf).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
                "tdfac_totcovaex"		: mObjSumDate.tdate_cpgvarexo,
                "tdfac_totcovaex_round"	: Ax.math.bc.of(mObjSumDate.tdate_cpgvarexo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP),
            },
            {
                "tdfac_serial"			: mRowDfac.tdfac_serial
            }
        );


    });

    console.timeEnd('INICIO CUADRE');

    mRsDfac.close();

    



    











	// Armado de la lista final de facturas a mostrar 
	if (mStrFacturas != '') {
		Ax.db.rollbackWork();
		let arr = mStrFacturas.split(" ");
		let result = arr.filter((item,index) => {
			return arr.indexOf(item) === index;
		}).join().replaceAll(" "," , ");
		throw "Lista de facturas que faltan datos: " + result;
	}

	/**
	 * [0] pIntIndicador => Proceso normal del cliente
	 * [1] pIntIndicador => Ejecución del código en modo simulación
	 */
	if (pIntIndicador == 1) {
		Ax.db.rollbackWork();
		return true
	}
}

// F418-00047571
var pdata = {
    tdl_nrolote: '0623050',
    tdf_centro: 'CRP0',
    tdl_financiador: '00043392'
}
// // F418-00046085
// var pdata = {
//     tdl_nrolote: '0622931',
//     tdf_centro: 'CRP0',
//     tdl_financiador: '00041343'
// }

datosFicheros(pdata, 0)





/**

SELECT * FROM fas_tedef_dfac_test WHERE tdfac_lote = '0622931' AND tdfac_nrodocpg = 'F418-00046085';
SELECT * FROM fas_tedef_date_test WHERE tdate_nrolote = '0622931' AND tdate_nrodocpg = 'F418-00046085';
SELECT * FROM fas_tedef_dserv_test WHERE tdserv_nrolote = '0622931';
SELECT * FROM fas_tedef_dfarm_test WHERE tdfarm_nrolote = '0622931';

 */