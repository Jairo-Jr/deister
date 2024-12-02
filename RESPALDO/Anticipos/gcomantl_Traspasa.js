/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 * 
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to 
 *  deister software and may be covered by trade secret or copyright law. 
 *  Dissemination of this information or reproduction of this material is strictly 
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed 
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication 
 *  for disclosure of this source code, which includes information that is confidential 
 *  and/or proprietary, and is a trade secret, of deister software
 * 
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE 
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF 
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, 
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 * 
 *  -----------------------------------------------------------------------------
 *  JS: gcomantl_Traspasa
 *      Version:    V1.0
 *      Date:       2021.10.07
 *      Description:                                                    
 *                                                                          
 *          Transfer advanced payments from origin document (pStrTabori) to the
 *          current one (pStrTabname). There is the list of all contempled origin
 *          tables below.                                                       
 *                                                                                       
 *                  pStrTabname           pStrTabori 
 *                  ===========           =============================                                 
 *                  gcompedh                                        
 *                  gcommovh              gcompedh -                                
 *                  gcomfach              gcompedh - gcommovh -                                  
 *                                                                                       
 *          It is always checked that for each type of tax code, document amount
 *          is not surpassed by the advanced payment.
 *          It is also checked that the total advanced payment amount is never
 *          greater than the document total amount.
 * 
 *          First select gets all the taxes that apply to the document, for each
 *          tax, look for those advanced payments related to the lines' origins
 *          that are suitable for the contempled tax, if found, transfer the 
 *          advanced payment. Once all the taxes have been considered, close batch
 *          in case of an invoice in order to update the data relative to document 
 *          taxes (gcomfach_tax).
 * 
 *          If there is still amount left to pay, it obtains all those advanced
 *          payments related to the lines' origins that have no associated taxes,
 *          until amount reaches zero or there are no more advanced payments.
 * 
 *          Finally, if pStrTabname is gcomfach, imptot value gets stored into
 *          pObjDocument again, and will then get updated at the end of the 
 *          validation and not here. 
 *
 *
 *      CALLED FROM:
 *      ==============
 *          JS      gcompedh_Gcomantl       Advanced payments reserves in purchase orders
 *          JS      gcommovh_Gcomantl       Advanced payments reserves in supplies
 *          JS      gcomfach_Gcomantl       Advanced payments reserves in purchase invoices
 *
 *
 *      PARAMETERS:
 *      ==============
 * 
 *      @param      {String}        pStrTabname     Table name
 *      @param      {String}        pStrTabori      Document's origin table
 *      @param      {String}        pStrSqlcond     Condition to get suitable advanced payments
 *      @param      {Obj}           pObjDocument    Document data
 *
 */
function gcomantl_Traspasa(pStrTabname, pStrTabori, pStrSqlcond, pObjDocument) {

    
    /**
     * Sets initial variables, mBcImptot is used to compare total document 
     * amounts without updating the register.
     */
    var mBcImptot = pObjDocument.imptot;
    var mBcImpliq = 0;
    var mObjGcomfach_tax = {};

    /**
     * CUSTOM CRP 14-05-2024 JPY:
     * Acumulamos los anticipos aplicados reales porque la cuota calculada en
     * gcomfach.cuoant podría diferir en decimales de lo que se ha reducido
     * realmente en los otros impuestos.
     */
    var mBcTotImpant = 0;

    /** 
     * All tax types involved with the parameter invoice are obtained. 
     */
    var mRsGdoccom = Ax.db.executeProcedure("gdoccom_get_tax_bases", columnIndex => {
            switch (columnIndex) {
                case 1  : return 'tax_oper';
                case 2  : return 'tax_code';
                case 3  : return 'tax_porcen';
                case 4  : return 'tax_basimp';
                default : return "undefined";
            }
        }, 
        pStrTabname, 
        pObjDocument.cabid
    );
    
    /**
     * CUSTOM CRP 23-05-2024 JPY:
     * 
     * Las detracciones y retenciones se debe reprocesar descontando
     * los anticipos.
     * Se debe considerar que no debe existir anticipos con impuestos
     * tipo detraccion o retencion (las facturas generadas si podrian
     * tenerlas pero el mismo anticipio solo deberia ser de impuesto
     * normal)
     */
    let mArrTaxRetDet = [];

    /**
     * For each one of invoice's tax types, 
     */
    for (var mRowGdoccom of mRsGdoccom) {

        if (pStrTabname == "gcomfach") {
            /**
             * It is possible to have different tax rules with identical 
             * Transactions and Tax Rates at destination, so the one with 
             * the highest amount is selected.
             */
            mObjGcomfach_tax = Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        gcomfach_tax.tax_seqno,
                        gcomfach_tax.tax_porded, gcomfach_tax.tax_porpro, 
                        gcomfach_tax.tax_basimp,  
                        gcomfach_tax.tax_cuoded, gcomfach_tax.tax_cuonded,
                        gcomfach_tax.tax_basant, gcomfach_tax.tax_cuoant,

                        ctax_class.class_type,   ctax_type.type_porcen
                    </columns>
                    <from table='gcomfach_tax'>
                        <join table='ctax_type'>
                            <on>gcomfach_tax.tax_code = ctax_type.type_code</on>
                            <join table='ctax_class'>
                                <on>ctax_type.type_class = ctax_class.class_code</on>
                            </join>
                        </join>
                    </from>
                    <where>
                            gcomfach_tax.cabid    = ?
                        AND gcomfach_tax.tax_oper = ?
                        AND gcomfach_tax.tax_code = ?
                    </where>
                    <order>
                        gcomfach_tax.tax_basimp DESC
                    </order>
                </select>
            `, pObjDocument.cabid, mRowGdoccom.tax_oper, mRowGdoccom.tax_code).toOne();
            
            if (["D", "R"].includes(mObjGcomfach_tax.class_type)) {
                mArrTaxRetDet.push(mObjGcomfach_tax);
            }
        }

        /**
         * Obtain all advanced payments settled to the origin table 
         * and SQL condition (function parameters) that still have 
         * some amount pendent to be transferred
         */
        var mRsGcomantl = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomantl.docant, gcomantl.docliq, gcomantl.manual,
                    gcomantl.impant - gcomantl.imptra impant,
                    gcomantl.imptra,

                    icon_get_divred(gcomanth.moneda) tipred,
                    ctax_type.type_porcen
                </columns>
                <from table='gcomantl'>
                    <join table='gcomanth'>
                        <on>gcomanth.docser = gcomantl.docant</on>
                        <on>gcomanth.tax_oper = ?</on>
                        <on>gcomanth.tax_code = ?</on>
                        <on>gcomanth.tax_code IS NOT NULL</on>
                        <join type='left' table='ctax_type'>
                            <on>gcomanth.tax_code = ctax_type.type_code</on>
                        </join>
                    </join>
                </from>
                <where>
                        gcomantl.tabliq = ?
                    AND gcomantl.imptra &lt; gcomantl.impant
                    AND ${pStrSqlcond}
                </where>
            </select>
        `, mRowGdoccom.tax_oper, mRowGdoccom.tax_code, pStrTabori);

        /**
         * For each one of these settlment lines see if they 
         * can be transferred
         */
        for (var mRowGcomantl of mRsGcomantl) {

            if (Ax.math.bc.compareTo(mRowGcomantl.impant, mRowGdoccom.tax_basimp) == 1) {
                mBcImpliq = mRowGdoccom.tax_basimp ;
            } else {
                mBcImpliq = mRowGcomantl.impant ;
            }

            if (Ax.math.bc.compareTo(mBcImpliq, 0) >  0) {

                /**
                 * After getting the advanced payment amount to be applied
                 * to the document, update both lines. The one related to the 
                 * origin document and the one related to the current one
                 */
                Ax.db.update('gcomantl',
                    {
                        imptra : Ax.math.bc.add(mRowGcomantl.imptra, mBcImpliq),
                    }, 
                    {
                        tabliq : pStrTabori,
                        docliq : mRowGcomantl.docliq, 
                        docant : mRowGcomantl.docant
                    });

                var mIntImpant = Ax.db.execute(`
                    UPDATE gcomantl 
                       SET gcomantl.impant = impant + ?
                     WHERE tabliq = ?
                       AND docliq = ?
                       AND docant = ?
                    `, mBcImpliq, pStrTabname, pObjDocument.docser, 
                       mRowGcomantl.docant
                ).getCount();

                /**
                 * If no registers relating the advanced payment to the 
                 * current document are found (update can't be carried out),
                 * inserts a new register.
                 */
                if (!mIntImpant) {
                    Ax.db.insert("gcomantl",{
                        docant : mRowGcomantl.docant,
                        tabliq : pStrTabname,
                        docliq : pObjDocument.docser,
                        impant : mBcImpliq,
                        imptra : 0,
                        manual : 0,
                        contab : 0
                    });
                }
            }

            /**
             * 
             * In case of an invoice, updates taxes and total amount, otherwise
             * store values in variables, as none of them have to be updated 
             * at the end.
             */
            if (pStrTabname == 'gcomfach') {
                /**
                 * Obtain the quota corresponding to the settlement amount
                 */
                // var mBcCuoant = Ax.math.bc.scale(
                //     Ax.math.bc.div(
                //         Ax.math.bc.mul(mBcImpliq, mRowGcomantl.type_porcen), 
                //         100
                //     ),
                //     mRowGcomantl.tipred, 
                //     Ax.math.bc.RoundingMode.HALF_UP
                // );
                
                /**
                 * CUSTOM CRP 14-06-2024 JPY:
                 * Por precision de decimales será mejor recalcular la cuota del
                 * impuesto a partir de la reducciòn del anticipo, y la cuota
                 * del anticipo a partir de la variaciòn de cuota
                 */
                let mBcNewCuoded = Ax.math.bc.scale(
                    Ax.math.bc.div(
                        Ax.math.bc.mul(
                            Ax.math.bc.sub(mObjGcomfach_tax.tax_basimp, mBcImpliq), 
                            mRowGcomantl.type_porcen
                        ), 
                        100
                    ),
                    mRowGcomantl.tipred, 
                    Ax.math.bc.RoundingMode.HALF_UP
                );
                
                console.log(mObjGcomfach_tax.tax_cuoded, mBcNewCuoded);
                let mBcCuoant = Ax.math.bc.sub(mObjGcomfach_tax.tax_cuoded, mBcNewCuoded);
                console.log('mBcCuoant', mBcCuoant);
                /**
                 * Prorrate and deduction incompatibles. Set the mandatory one. 
                 * Priority on prorrate
                 */
                if (Ax.math.bc.compareTo(mObjGcomfach_tax.tax_porpro, 100) != 0) {
                    mRowGdoccom.tax_ded = mObjGcomfach_tax.tax_porpro;
                } else {
                    mRowGdoccom.tax_ded = mObjGcomfach_tax.tax_porded;
                }

                /**
                 * Change taxable amount, tax liability and total invoice amount
                 */
                if (Ax.math.bc.compareTo(mRowGdoccom.tax_ded, 100) == 0) {
                    mRowGdoccom.cuoant_ded  = mBcCuoant;
                    mRowGdoccom.cuoant_nded = 0;
                } else {
                    mRowGdoccom.cuoant_ded = Ax.math.bc.scale(
                        Ax.math.bc.div(
                            Ax.math.bc.mul(mBcCuoant, mRowGdoccom.tax_ded), 
                            100
                        ),
                        mRowGcomantl.tipred, 
                        Ax.math.bc.RoundingMode.HALF_UP
                    );

                    mRowGdoccom.cuoant_nded = Ax.math.bc.sub(mBcCuoant, mRowGdoccom.cuoant_ded);
                }
                
                mObjGcomfach_tax.tax_basimp  = Ax.math.bc.sub(mObjGcomfach_tax.tax_basimp,  mBcImpliq);
                mObjGcomfach_tax.tax_cuoded  = Ax.math.bc.sub(mObjGcomfach_tax.tax_cuoded,  mRowGdoccom.cuoant_ded);
                mObjGcomfach_tax.tax_cuonded = Ax.math.bc.sub(mObjGcomfach_tax.tax_cuonded, mRowGdoccom.cuoant_nded);
                mObjGcomfach_tax.tax_basant  = Ax.math.bc.add(mObjGcomfach_tax.tax_basant,  mBcImpliq);
                mObjGcomfach_tax.tax_cuoant  = Ax.math.bc.add(mObjGcomfach_tax.tax_cuoant,  mBcCuoant);

                mRowGdoccom.tax_basimp = mObjGcomfach_tax.tax_basimp;
                console.log(mBcImptot, mBcImpliq, mBcCuoant)
                mBcImptot = Ax.math.bc.sub(mBcImptot, mBcImpliq, mBcCuoant);
                console.log('****** gcomantl_Traspasa ******', pObjDocument.imptot, mBcImptot);
                mBcTotImpant = Ax.math.bc.add(mBcTotImpant, mBcImpliq, mBcCuoant);
            } else {
                mRowGdoccom.tax_basimp = Ax.math.bc.sub(mRowGdoccom.tax_basimp, mBcImpliq);
                mBcImptot = Ax.math.bc.sub(mBcImptot, mBcImpliq);

                mBcTotImpant = Ax.math.bc.add(mBcTotImpant, mBcImpliq);
            }

            /**
             * If advanced payment already covers tax base or total invoice
             * amount, exit from loop
             */
            if (Ax.math.bc.compareTo(mBcImptot, 0) <=  0 || 
                Ax.math.bc.compareTo(mRowGdoccom.tax_basimp, 0) <= 0) {
                break;
            }
        }

        mRsGcomantl.close();

        /**
         * Updating of the final amounts for each tax code and transaction 
         * related to the invoice if it has changed.
         */
        if (pStrTabname == "gcomfach" && mObjGcomfach_tax.hasChanged()) {
            Ax.db.update("gcomfach_tax",
                mObjGcomfach_tax.getChanged(),
                { 
                    tax_seqno : mObjGcomfach_tax.tax_seqno
                }
            );
        }

        if (Ax.math.bc.compareTo(mRowGdoccom.tax_basimp, 0) <= 0) {
            break;
        }
    }
    
    /**
     * CUSTOM CRP 23-05-2024 JPY: 
     * 
     * Recalculo de impuestos con los anticipos actualizados
     */
    if (pStrTabname == "gcomfach"  &&
        Ax.math.bc.compareTo(mBcImptot, 0) > 0 && 
        mArrTaxRetDet.length) {

        /**
         * LOCAL FUNCTION : __taxRound
         *
         *    Round first parameter to numbre of digits indicated by second 
         *    parameter.
         *
         *      @param {decimal}        pBcNumber           Number to round
         *      @param {decimal}        pBcDivred           Digits of round operation
         *
         */
        function __taxRound(pBcNumber, pBcDivred) {
            return Ax.math.bc.scale(pBcNumber, pBcDivred, Ax.math.bc.RoundingMode.HALF_UP);
        }

        // let mBcTotImpant = Ax.db.executeGet(`
        //     SELECT (impant + cuoant) tot_impant
        //       FROM gcomfach 
        //      WHERE cabid = ?
        // `, pObjDocument.cabid);
        
        for (let mRowTax of mArrTaxRetDet) {
            
            let mBcTaxBasimp = Ax.math.bc.sub(mRowTax.tax_basimp, mBcTotImpant);
            
            // Tax quote 
            /**
             * DETRACCIONES
             * CUSTOM CRP 26-06-2022: En perú las detracciones son sin decimales.
             * CUSTOM CRP 23-03-2023: En documento aplica solo si es moneda local
             * CUSTOM CRP 22-02-2024: Si la moneda no es local, el importe se pasa
             * a moneda local, se redondea sin decimales y se reconvierte a moneda
             * del documento.
             */
            let mBcTaxCuota = 0;
    
            if (mRowTax.class_type == "D") {
                if (Ax.math.bc.compareTo(pObjDocument.divloc_factor, 1) == 0) {
                    //Moneda local : Redondeado
    
                    mBcTaxCuota = __taxRound(
                        Ax.math.bc.mul(mBcTaxBasimp, Ax.math.bc.div(mRowTax.type_porcen, 100)),
                        0
                    );
                } else {
                    //Moneda extranjera : Convertido a local, redondeado y reconversion
                    let mBcTaxCuotaLoc = __taxRound(
                        Ax.math.bc.mul(
                            mBcTaxBasimp, 
                            Ax.math.bc.div(mRowTax.type_porcen, 100),
                            pObjDocument.divloc_factor
                        ),
                        0
                    );
                    
                    mBcTaxCuota = __taxRound(
                        Ax.math.bc.div(mBcTaxCuotaLoc, pObjDocument.divloc_factor),
                        pObjDocument.cmonedas_tipred
                    );
                }

                pObjDocument.tot_DET = mBcTaxCuota;
            } else {
                mBcTaxCuota = __taxRound(
                    Ax.math.bc.mul(mBcTaxBasimp, Ax.math.bc.div(mRowTax.type_porcen, 100)),
                    pObjDocument.cmonedas_tipred
                );
                
                pObjDocument.tot_RET = mBcTaxCuota;
            }
            
            /**
             * CUSTOM CRP 14-6-2024 JPY:
             * Las variaciones por aplicacion de anticipos se informan en la
             * parte de anticipos.
             */
            let mBcBasant = Ax.math.bc.sub(mRowTax.tax_basimp, mBcTaxBasimp);
            let mBcCuoant = Ax.math.bc.sub(mRowTax.tax_cuoded, mBcTaxCuota);

            Ax.db.update("gcomfach_tax",
                {
                    tax_basimp : mBcTaxBasimp,
                    tax_cuoded : mBcTaxCuota,
                    
                    tax_basant : mBcBasant,
                    tax_cuoant : mBcCuoant
                },
                { 
                    tax_seqno : mRowTax.tax_seqno
                }
            );
        }
    }

    /**
     * Skip if document has been totally anticipated. Otherwise,
     * transfer advanced payments without associated VAT
     */
    if (Ax.math.bc.compareTo(mBcImptot, 0) > 0) {
        /**
         * Obtains all advanced payments whose tax code is null, are
         * linked to origin table and fulfill SQL condition.
         */
        var mRsGcomantlNoTaxCode = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomantl.docant, gcomantl.docliq, gcomantl.manual,
                    gcomantl.impant - gcomantl.imptra impliq,
                    gcomantl.imptra
                </columns>
                <from table='gcomantl'>
                    <join table='gcomanth'>
                        <on>gcomantl.docant = gcomanth.docser</on>
                        <on>gcomanth.tax_code IS NULL</on>
                    </join>
                </from>
                <where>
                        gcomantl.tabliq = ?
                    AND gcomantl.imptra &lt; gcomantl.impant
                    AND ${pStrSqlcond}
                </where>
            </select>
        `, pStrTabori);
    
        /**
         * For each one of the advanced payments settlements, links
         * it to the current document
         */
        for (var mRowGcomantlNoTaxCode of mRsGcomantlNoTaxCode) {
    
            /**
             * Avoids advancing a greater amount than the document
             * one
             */
            if (Ax.math.bc.compareTo(mRowGcomantlNoTaxCode.impliq, mBcImptot) == 1) {
                mRowGcomantlNoTaxCode.impliq = mBcImptot
            }
    
            if (Ax.math.bc.isZero(mRowGcomantlNoTaxCode.impliq)) {
                continue;
            }

            /**
             * After getting the advanced payment amount to be applied
             * to the document, update both lines. The one related to the 
             * origin document and the one related to the current one
             */
            Ax.db.update('gcomantl',
                {
                    imptra : Ax.math.bc.add(mRowGcomantlNoTaxCode.imptra, mRowGcomantlNoTaxCode.impliq),
                }, 
                {
                    tabliq : pStrTabori,
                    docliq : mRowGcomantlNoTaxCode.docliq, 
                    docant : mRowGcomantlNoTaxCode.docant
                }
            );
    
            var mIntCountImpant = Ax.db.execute(`
                UPDATE gcomantl
                   SET gcomantl.impant = impant + ? 
                 WHERE gcomantl.tabliq = ?
                   AND gcomantl.docliq = ?
                   AND gcomantl.docant = ?
                `, mRowGcomantlNoTaxCode.impliq, pStrTabname, 
                   pObjDocument.docser,          mRowGcomantlNoTaxCode.docant
            ).getCount();
    
            /**
             * If no registers relating the advanced payment to the 
             * current document are found (update can't be carried out),
             * inserts a new register.
             */
            if (!mIntCountImpant) {
                Ax.db.insert("gcomantl",{
                    docant : mRowGcomantlNoTaxCode.docant,
                    tabliq : pStrTabname,
                    docliq : pObjDocument.docser,
                    impant : mRowGcomantlNoTaxCode.impliq,
                    imptra : 0,
                    manual : 0,
                    contab : 0
                });
            }   
            
            /**
             * Updates the document amount variable, to keep the 
             * last calculations updated and consider them on next 
             * iteration.
             */
            mBcImptot = Ax.math.bc.sub(mBcImptot, mRowGcomantlNoTaxCode.impliq);
            
            
            if (Ax.math.bc.compareTo(mBcImptot, 0) <= 0) {
                break;
            }
        }

        mRsGcomantlNoTaxCode.close();
    }

    /**
     * If transferring to an invoice, document's total amount 
     * considers advanced payments, so it gets stored within the
     * header object to be updated once validation process ends. 
     */
    if (pStrTabname == "gcomfach") {
        pObjDocument.imptot = mBcImptot;
        
    }
} 