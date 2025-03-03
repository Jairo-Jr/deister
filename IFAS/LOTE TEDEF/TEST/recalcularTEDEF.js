/* ========================================================================== **
**																			  **
**		JS_NAME																  **
**																			  **
**	Parameters:																  **
**																			  **
**																			  **
** ========================================================================== */ 
function recalcularTEDEF(pdata) {
    
    var mStrLote = pdata.tdl_nrolote;
    var mDifTotales = 0;
    var mDifBases = 0;
    var mBaseCalc = 0;
	var mAjusCoaExo = 0;
    var mObjDfac = {};

    function ajusteDiferenciaDate(mStrLote, fvh_numero, mDifBases, mStrCopago){

        var mRestoDiff = 0;
        var mDecimal = 0.01;
        var mObjDate = {};

        var mRsDate = Ax.db.executeQuery(`
            <select>
                <columns>
                    fas_tedef_date.tdate_serial,
                    fas_tedef_date.tdate_pres,
                    fas_tedef_date.tdate_tipoafi,

                    fas_tedef_date.tdate_cpgvaraf,
                    fas_tedef_date.tdate_cpgvaraf_round,

                    fas_tedef_date.tdate_cpgfijaf,
                    fas_tedef_date.tdate_cpgfijaf_round,

					fas_tedef_date.tdate_cpgvarexo,
                    fas_tedef_date.tdate_cpgvarexo_round
                </columns>
                <from table='fas_tedef_date'>
                </from>
                <where>
                    tdate_nrolote = ?
                    AND tdate_nrodocpg = ?
                </where>
            </select>
        `, mStrLote, fvh_numero).toMemory();

		// Define update batch para DATE
        var batchDATE = Ax.db.updateBatch('fas_tedef_date');
        batchDATE.setBatchSize(500);

        mRsDate.forEach(mRowDate => {

            // Si existe diferencia pendiente
            if(Ax.math.bc.abs(mDifBases) > 0.00){

				mObjDate = {
					tdate_cpgvaraf: mRowDate.tdate_cpgvaraf,
					tdate_cpgvaraf_round: mRowDate.tdate_cpgvaraf_round,
					tdate_cpgfijaf: mRowDate.tdate_cpgfijaf,
					tdate_cpgfijaf_round: mRowDate.tdate_cpgfijaf_round,
					tdate_cpgvarexo: mRowDate.tdate_cpgvarexo,
					tdate_cpgvarexo_round: mRowDate.tdate_cpgvarexo_round
				}

                // Si la diferencia es positiva, el decimal a actualizar debe ser negativo.
                if(mDifBases > 0.00){
                    mDecimal = -0.01;
                // Si la diferencia es negativo, el decimal a actualizar debe ser positivo.
                }else if(mDifBases < 0.00){
                    mDecimal = 0.01;
                }

                // Total copago variable afecto
                if(mStrCopago == 'tdfac_totcovaaf' && mRowDate.tdate_cpgvaraf > 0.00){
                    mObjDate.tdate_cpgvaraf = Ax.math.bc.add(mRowDate.tdate_cpgvaraf, mDecimal);
                    mObjDate.tdate_cpgvaraf_round = Ax.math.bc.add(mRowDate.tdate_cpgvaraf_round, mDecimal);

                    mDifBases = Ax.math.bc.add(mDifBases, mDecimal);
                // Total copago fijo afecto
                } else if(mStrCopago == 'tdfac_totcofjaf' && mRowDate.tdate_cpgfijaf > 0.00){
                    mObjDate.tdate_cpgfijaf = Ax.math.bc.add(mRowDate.tdate_cpgfijaf, mDecimal);
                    mObjDate.tdate_cpgfijaf_round = Ax.math.bc.add(mRowDate.tdate_cpgfijaf_round, mDecimal);

                    mDifBases = Ax.math.bc.add(mDifBases, mDecimal);
                } else if(mStrCopago == 'tdate_cpgvarexo' && mRowDate.tdate_cpgvarexo > 0.00){

                    mObjDate.tdate_cpgvarexo = Ax.math.bc.add(mRowDate.tdate_cpgvarexo, mDecimal);
                    mObjDate.tdate_cpgvarexo_round = Ax.math.bc.add(mRowDate.tdate_cpgvarexo_round, mDecimal);

                    mDifBases = Ax.math.bc.add(mDifBases, mDecimal);
                }

                if(!(Object.keys(mObjDate).length === 0)){
                    
                    // Ax.db.update('fas_tedef_date', mObjDate, 
                    //                 {
                    //                     tdate_serial: mRowDate.tdate_serial
                    //                 });

					batchDATE.addBatch(
                        mObjDate,
                        {tdate_serial: mRowDate.tdate_serial}
                     );
                }
            }
        });
		batchDATE.close();
		mRsDate.close();
        
    }

    var mRsDfac = Ax.db.executeQuery(`
        <select>
            <columns>
                fas_tedef_dfac.tdfac_serial,
                fas_tedef_dfac.tdfac_nrodocpg,
                fas_tedef_dfac.tdfac_mntprepac,
                fas_tedef_dfac.tdfac_totcofjaf,
                fas_tedef_dfac.tdfac_totcofjex,
                fas_tedef_dfac.tdfac_totcovaaf,
                fas_tedef_dfac.tdfac_totcovaex,
                fas_tedef_dfac.tdfac_baseimp,
                fas_tedef_dfac.tdfac_montofact,
                fas_tedef_dfac.tdfac_totfact,

                <!-- Factura -->
                ROUND(fas_factura_venta.fvh_base_imponible, 2) fvh_base_imponible,
                ROUND(fas_factura_venta.fvh_impuesto_val, 2) fvh_impuesto_val,
                ROUND(fas_factura_venta.fvh_importe_total, 2) fvh_importe_total
            </columns>
            <from table='fas_tedef_dfac'>
                <join table='fas_factura_venta'>
                    <on>fas_tedef_dfac.tdfac_nrodocpg = fas_factura_venta.fvh_numero</on>
					<on>fas_factura_venta.fvh_centro = 'CRP0'</on>
                </join>
            </from>
            <where>
                tdfac_lote = ?
            </where>
        </select>
    `, mStrLote).toMemory();

	// Define update batch para DFAC
    var batchDFAC = Ax.db.updateBatch('fas_tedef_dfac');
    batchDFAC.setBatchSize(500);

    mRsDfac.forEach(mRowDfac => {

        mDifBases = 0;
		mAjusCoaExo = 0;

        /**
         * Diferencia a nivel de total
        */
        mDifTotales = Ax.math.bc.abs(Ax.math.bc.sub(mRowDfac.fvh_importe_total, mRowDfac.tdfac_totfact));
        
        if(mDifTotales > 0.00){
			
			mObjDfac = {
				tdfac_baseimp: mRowDfac.tdfac_baseimp,
				tdfac_totfact: mRowDfac.tdfac_totfact,
				tdfac_montofact: mRowDfac.tdfac_montofact,
                
				tdfac_totcovaaf: mRowDfac.tdfac_totcovaaf,
				tdfac_totcofjaf: mRowDfac.tdfac_totcofjaf,
                tdfac_totcovaex: mRowDfac.tdfac_totcovaex,
                tdfac_totcofjex: mRowDfac.tdfac_totcofjex
			}
			
            /**
             * Si existen Copago exonerado de IGV:
             *  - tdfac_totcofjex: Copago fijo exonerado de IGV
             *  - tdfac_totcovaex: Copago variable exonerado de IGV
             * La base imponible es el resultado de Base Imponible de factura + (Suma de copagos exonerados de IGV)*100/118;
             *  - mBaseCalc = mRowDfac.fvh_base_imponible + mRowDfac.tdfac_totcovaex*100/118
            */
            if(Ax.math.bc.add(mRowDfac.tdfac_totcofjex, mRowDfac.tdfac_totcovaex) > 0.00){
                mBaseCalc = Ax.math.bc.add(mRowDfac.fvh_base_imponible, Ax.math.bc.div(Ax.math.bc.mul(mRowDfac.tdfac_totcovaex, 100), 118)).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
            } else {
                /**
                 * Si no existen Copago exonerado de IGV:
                 *  - tdfac_totcofjex: Copago fijo exonerado de IGV
                 *  - tdfac_totcovaex: Copago variable exonerado de IGV
                 * La base imponible es igual a Base Imponible de factura
                */
                mBaseCalc = mRowDfac.fvh_base_imponible
            }

            mDifBases = Ax.math.bc.sub(mBaseCalc, mRowDfac.tdfac_baseimp);

            if(mDifBases < 0.00){
                // Aplica la diferencia a la base imponible
                mRowDfac.tdfac_baseimp = Ax.math.bc.sub(mRowDfac.tdfac_baseimp, Ax.math.bc.abs(mDifBases));
                mObjDfac.tdfac_baseimp = mRowDfac.tdfac_baseimp;

				mObjDfac.tdfac_totfact = mRowDfac.fvh_importe_total;
                mObjDfac.tdfac_montofact = mRowDfac.fvh_impuesto_val;

                if(mRowDfac.tdfac_totcovaaf > 0.00){
                    
                    // Se lleva la diferencia a Atención (Copago variable afecto a IGV sin IGV)
                    mRowDfac.tdfac_totcovaaf = Ax.math.bc.add(mRowDfac.tdfac_totcovaaf, Ax.math.bc.abs(mDifBases));
                    mObjDfac.tdfac_totcovaaf = mRowDfac.tdfac_totcovaaf;



                    ajusteDiferenciaDate(mStrLote, mRowDfac.tdfac_nrodocpg, mDifBases, 'tdfac_totcovaaf');

                } else if(mRowDfac.tdfac_totcofjaf > 0.00){
                    mRowDfac.tdfac_totcofjaf = Ax.math.bc.add(mRowDfac.tdfac_totcofjaf, Ax.math.bc.abs(mDifBases));
                    mObjDfac.tdfac_totcofjaf = mRowDfac.tdfac_totcofjaf;
                }

                mDifBases = Ax.math.bc.add(mDifBases, Ax.math.bc.abs(mDifBases));
            } else if(mDifBases > 0.00){

                // Aplica la diferencia a la base imponible
                mRowDfac.tdfac_baseimp = Ax.math.bc.add(mRowDfac.tdfac_baseimp, mDifBases);
                mObjDfac.tdfac_baseimp = mRowDfac.tdfac_baseimp;

                mObjDfac.tdfac_totfact = mRowDfac.fvh_importe_total;
                mObjDfac.tdfac_montofact = mRowDfac.fvh_impuesto_val;

                if(mRowDfac.tdfac_totcovaaf > 0.00){
                    
                    // Se lleva la diferencia a Atención (Copago variable afecto a IGV sin IGV)
                    mRowDfac.tdfac_totcovaaf = Ax.math.bc.sub(mRowDfac.tdfac_totcovaaf, mDifBases);
                    mObjDfac.tdfac_totcovaaf = mRowDfac.tdfac_totcovaaf;

                    ajusteDiferenciaDate(mStrLote, mRowDfac.tdfac_nrodocpg, mDifBases, 'tdfac_totcovaaf');

                } else if(mRowDfac.tdfac_totcofjaf > 0.00){
                    mRowDfac.tdfac_totcofjaf = Ax.math.bc.sub(mRowDfac.tdfac_totcofjaf, mDifBases);
                    mObjDfac.tdfac_totcofjaf = mRowDfac.tdfac_totcofjaf;
                }

                mDifBases = Ax.math.bc.sub(mDifBases, mDifBases);

            } else if(mDifBases == 0.00 && Ax.math.bc.add(mRowDfac.tdfac_totcofjex, mRowDfac.tdfac_totcovaex) > 0.00){
                mAjusCoaExo = mDifTotales > 0.00 ? mDifTotales*-1 : mDifTotales

                if(mRowDfac.tdfac_totcovaex > 0.00){
                    mObjDfac.tdfac_totcovaex = Ax.math.bc.add(mRowDfac.tdfac_totcovaex, mAjusCoaExo);
                    mObjDfac.tdfac_totfact = mRowDfac.fvh_importe_total;

					ajusteDiferenciaDate(mStrLote, mRowDfac.tdfac_nrodocpg, mAjusCoaExo*-1, 'tdate_cpgvarexo');

                } else if(mRowDfac.tdfac_totcofjex > 0.00){
                    mObjDfac.tdfac_totcofjex = Ax.math.bc.add(mRowDfac.tdfac_totcofjex, mAjusCoaExo);
                    mObjDfac.tdfac_totfact = mRowDfac.fvh_importe_total;

					// ajusteDiferenciaDate(mStrLote, mRowDfac.tdfac_nrodocpg, mAjusCoaExo*-1, 'tdate_cpgvarexo');
                }
            }
            
            if(!(Object.keys(mObjDfac).length === 0)){
                /*Ax.db.update('fas_tedef_dfac', mObjDfac, 
                                {
                                    tdfac_serial: mRowDfac.tdfac_serial
                                });*/
				batchDFAC.addBatch(
                        mObjDfac,
                        {tdfac_serial: mRowDfac.tdfac_serial}
                     );
            }
			
            
        }
    });
	batchDFAC.close();
    mRsDfac.close();
    return mRsDfac;
}


var pdata = {
    tdl_nrolote: '0623134',
    tdf_centro: 'CRP0',
    tdl_financiador: '00043288'
}

return recalcularTEDEF(pdata);