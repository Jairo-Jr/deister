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
 *  Module: gcomfach_workflow
 *      Version:    V1.9
 *      Date:       2024.05.27
 *      Description: Makes all calculations of a purchase invoice and checks its
 *                   workflow.
 *
 *      CLASS METHODS
 *      =============
 *          validate_prev   Makes the previous operations required to invoice
 *                          validation and calculation.
 *          calculate_line  Obtains price, discounts and calculate line amount.
 *          calculate_head  Calculate head amount, taxes and payment dues.
 *          validate_post   Makes the previous operations required to invoice
 *                          validation and calculation.
 *
 *
 *      CALLED FROM:
 *      ==============
 *      JS: gcomfach_Validate
 *
 */
const workflowRuleIGES = require("workflowRuleIGES").workflowRuleIGES;

/**=============================================================================
 *
 * WORKFLOW RULE IMPLEMENTATION
 *
 * =============================================================================
 */
class gcomfach_workflow extends workflowRuleIGES {
    /**
     * Class constructor
     *
     * Call superclass constructor
     */
    constructor() {
        super("gcomfach");

        this.log_gcomfach = console.HTMLTable("function gcomfach_workflow", ["cabid", "docser", "tercer", "fecha"]);
        this.log_gcomfacl = null;
    }

    /**
     *
     *  validate_prev
     *
     *  Is a Class Method that make the previous operations required to invoice
     *  validation and calculation.
     *
     *  The operations involved in this funcition are.
     *
     *      . Delete rounding lines generated previously.
     *      . Reset to zero the invoice gross amount.
     *      . Obtains all tariffs required later in calculations.
     *      . Obtains general discount tariff.
     *      . Load general discounts in an resulset.
     *      . Prepare structures required later for operations like rounding,
     *        assets generation.
     *
     *  Returns an object [pObjCalcData] with all objects required and auxliary
     *  data prepared.
     *
     */
    validate_prev(pObjGcomfach) {

        var log_validate_prev = this.log_gcomfach.addTable("Previous validate", ["message"]);

        /**
         *  Initialize fixed assets process. Values of gconfacd.geninm:
         *      [0] Not generate
         *      [1] Generate at invoice validation
         *      [2] Generate when invoice accounting
         *
         */
        if (pObjGcomfach.document_geninm == 1) {
            this.setDocproc("i");
        }

        /**
         *  Initialize budget process. Values of gcomfacd.cominv
         *      [S]     Generate when invoice is valid (estcab = 'V')
         *      [E]     Evolution. Generate when invoice is valid (estcab = 'V') or
         *                         Invalid (estcab = 'E')
         *      [N]     No.        No generate budget movements
         *
         */
        if (pObjGcomfach.document_cominv == 'S' || pObjGcomfach.document_cominv  == "E") {
            this.setDocproc("p");
        }

        /**
         * Roundings are made if pObjGcomfach.impfac is filled.
         * Here we reset rounding lines inserted in previous validations.
         * Rounding lines are marked now with [orden = -999].
         */
        if (!Ax.math.bc.isZero(pObjGcomfach.impfac)) {
            /**
            * Lines of order -999 are deleted.
            */
            Ax.db.delete("gcomfacl",
                {
                    orden : -999,
                    cabid : pObjGcomfach.cabid
                }
            );
        }

        /**
         * Initialice pObjGcomfach.fach_gross with sum of net amount of lines.
         */
        pObjGcomfach.fach_gross = 0;

        /**
         * Obtains all tariffs(prices, discounts), that can be applied to
         * document.
         */
        log_validate_prev.addRow([`Get Price Lists`]);

        var mRsPriceLists = Ax.db.call('gcom_PriceLists',
            'gcomfach',
            pObjGcomfach.tipdoc,
            pObjGcomfach.empcode,
            pObjGcomfach.delega,
            pObjGcomfach.depart,
            pObjGcomfach.clasif,
            pObjGcomfach.fecha,
            pObjGcomfach.tercer,
            pObjGcomfach.tipdir,
            pObjGcomfach.date_created,
            { tarpre : pObjGcomfach.gproveed_tarpre,
              tardtg : pObjGcomfach.gproveed_tardtg,
              tardtf : pObjGcomfach.gproveed_tardtf,
              clapro : pObjGcomfach.gproveed_clasif });

        /**
         * Load head discounts from general discounts.
         */
        var mRsHeadDtos = null;
        if (pObjGcomfach.document_dtoesp == 'S') {
            mRsHeadDtos = Ax.db.call("gcomfach_dtcl_Load",
                pObjGcomfach.cabid,
                pObjGcomfach.divisa,
                pObjGcomfach.fecha,
                mRsPriceLists
            );
        }

        /**
         * Initialize object [mObjCalcData] with auxiliary data required for
         * validations and calculations.
         */
        var mObjCalcData = {
            headDtos   : mRsHeadDtos,
            priceLists : mRsPriceLists
        };

        /**
         * Struct used to store line with highest amount.
         * The tax type of this line with be used to
         */
        mObjCalcData.roundData = {
            linid      : null,
            tax_code1  : null,
            tax_oper1  : null,
            tax_code2  : null,
            tax_oper2  : null,
            tax_code3  : null,
            tax_oper3  : null,
            max_absnet : 0
        };

        /**
         * Source delivery note.
         * We store an array with differents cabori
         */
        mObjCalcData.arr_cabori = [];

        /**
         * If mObjCalcData.geninm == 1 implies generating fixed assets on
         * validation.
         *
         * Prepare data required for fixed assets generation.
         */
        mObjCalcData.assetData = null;
        if (pObjGcomfach.document_geninm == 1) {
            mObjCalcData.assetData = [];
        }

        return mObjCalcData;
    }

    /**
     *
     * calculate_line.
     *
     * Is a class method that find price/list discounts and calculate line amount.
     * Among other things:
     *      Obtains price.
     *      Load price discounts
     *      Load family discounts.
     *      Calcute net amount, etc.
     *
     */
    calculate_line(pObjGcomfach, pObjGcomfacl, pObjCalcData) {
        var log_calculate_line = this.log_gcomfacl.addTable("Calculate Line", ["Method", "message"]);

        /**
         *
         * Ensures negative quantity in credit notes.
         *
         */
        if (pObjGcomfach.document_abono != "N" && Ax.math.bc.compareTo(pObjGcomfacl.canfac, 0) > 0) {
            pObjGcomfacl.canfac = -pObjGcomfacl.canfac;
            pObjGcomfacl.cantid = -pObjGcomfacl.cantid;
            pObjGcomfacl.canpre = -pObjGcomfacl.canpre;
        }

        /**
         *  Calculate line net amount
         */
        var ret = Ax.db.call('gcom_CalcLine',
                  pObjGcomfach,
                  pObjGcomfacl,
                  pObjCalcData.priceLists,
                  pObjCalcData.headDtos
        );
        
        var log = ret.arrlogs;
        log_calculate_line.addRow(['gcom_CalcLine', log]);
        var mBcCosesc = (ret !== null && ret.cosInfo !== null ? ret.cosInfo.cosesc : null);

        /**
         *  Calculate coste
         */
        pObjGcomfacl.impcos = null;
        if (Ax.math.bc.isZero(pObjGcomfacl.canpre)) {
            pObjGcomfacl.impcos = 0;            
        } else  {
            pObjGcomfacl.impcos = 
                (mBcCosesc != null ?  
                        Ax.math.bc.mul(mBcCosesc,
                            Ax.math.bc.sub(1, Ax.math.bc.div(pObjGcomfach.dtogen, 100))) : 
                    
                        Ax.math.bc.mul(Ax.math.bc.abs(Ax.math.bc.div(pObjGcomfacl.impnet, pObjGcomfacl.cancost)),
                            Ax.math.bc.sub(1, Ax.math.bc.div(pObjGcomfach.dtogen, 100)),
                            pObjGcomfach.divloc_factor));
                        
            pObjGcomfacl.impcos = Ax.math.bc.mul(pObjGcomfacl.impcos, 
                Ax.math.bc.add(1, pObjGcomfacl.tax_cost));
    	}

        /**
         *  Set correct amount of accounting data.
         */
        if (pObjGcomfacl.exist_datc) {
        	Ax.db.executeProcedure("gcomfacl_datc_set_import", pObjGcomfacl.linid, pObjGcomfacl.impnet);
        }

        var mDecImpnet = this.getRound(pObjGcomfacl.impnet, pObjGcomfach.cmonedas_tipred);

        /**
         *  Set aggregate value of fach_gross
         */
        pObjGcomfach.fach_gross = Ax.math.bc.add(pObjGcomfach.fach_gross, mDecImpnet);

        /**
         *  Set aggregate value of base_discount
         */
        if (pObjGcomfacl.docfoot == 0) {
            pObjGcomfach.base_discount = Ax.math.bc.add(pObjGcomfach.base_discount, mDecImpnet);
        }

        /**
         *  Set aggregate value of base_dtopp
         */
        if (pObjGcomfacl.docfoot == 1 || pObjGcomfacl.docfoot == 3) {
            pObjGcomfach.base_dtopp = Ax.math.bc.add(pObjGcomfach.base_dtopp, mDecImpnet);
        }

        /**
         *  If line is a footer, the document typology generates costs and the item has the type of
         *  delivery note to be charged. Generates the associated supply.
         */
        if (pObjGcomfacl.docfoot != 0 && pObjGcomfach.document_albfoot == 1 && pObjGcomfacl.garticul_albfoot != null) {
            this.setDocproc("w");
        }

        /**
         * If there is any footer with accounting distribution, set indicator
         */
        if (pObjGcomfacl.docfoot == 3 || pObjGcomfacl.docfoot == 4) {
            pObjGcomfach.account_dis = true;
        }

        /**
         *  Store line with highest amount
         *  The algorithm generates a line with tax type of  maximum amount.
         */
        if (!Ax.math.bc.isZero(pObjGcomfach.impfac) &&
            (Ax.math.bc.compareTo(Ax.math.bc.abs(pObjGcomfacl.impnet), pObjCalcData.roundData.max_absnet) == 1)) {
            pObjCalcData.roundData.max_absnet = Ax.math.bc.abs(pObjGcomfacl.impnet);
            pObjCalcData.roundData.linid      = pObjGcomfacl.linid;
        }

        /**
         *  If invoice has a source delivery note, we stores an array with
         *  differents cabori (source documents identifiers).
         *  Is used in some later processes as generating budget movements
         *  (cpar_premovi).
         */
        if (pObjGcomfach.document_tabori == "TC" &&
            pObjGcomfacl.cabori != null          &&
           !pObjCalcData.arr_cabori.includes(pObjGcomfacl.cabori)) {
            pObjCalcData.arr_cabori.push(pObjGcomfacl.cabori);
        }

        /**
         *  Data required for fixed Axsets generation.
         *
         *  document_geninm == 1 => Generate assets on validation
         */
        if (pObjGcomfach.document_geninm == 1 && pObjGcomfacl.gartfami_codinm != null) {
            log_calculate_line.addRow(['assetData.push', '']);

            pObjCalcData.assetData.push({
                empcode          :  pObjGcomfach.empcode,
                tipdoc           :  pObjGcomfach.tipdoc,
                delega           :  pObjGcomfach.delega,
                depart           :  pObjGcomfach.depart,
                fecha            :  pObjGcomfach.fecha,
                tercer           :  pObjGcomfach.tercer,
                tipdir           :  pObjGcomfach.tipdir,
                terenv           :  pObjGcomfach.tercer,
                direnv           :  pObjGcomfach.tipdir,
                docser           :  pObjGcomfach.docser,
                refter           :  pObjGcomfach.refter,
                dtogen           :  pObjGcomfach.dtogen,
                codpre           :  pObjGcomfach.codpre,
                codpar           :  pObjGcomfach.codpar,
                dockey           :  pObjGcomfach.dockey,
                gdeparta_proyec  :  pObjGcomfach.gdeparta_proyec,
                gdeparta_seccio  :  pObjGcomfach.gdeparta_seccio,
                gdeparta_ctaexp  :  pObjGcomfach.gdeparta_ctaexp,
                gdeparta_centro  :  pObjGcomfach.gdeparta_centro,

                docid            :  pObjGcomfacl.linid,
                codart           :  pObjGcomfacl.codart,
                varlog           :  pObjGcomfacl.varlog,
                canmov           :  pObjGcomfacl.canfac,
                impnet           :  pObjGcomfacl.impnet,
                desvar           :  pObjGcomfacl.desvar || pObjGcomfacl.garticul_nomart,
                exist_datc       :  pObjGcomfacl.exist_datc,
                gartfami_codinm  :  pObjGcomfacl.gartfami_codinm,
                gartfami_serele  :  pObjGcomfacl.gartfami_serele,
                gartfami_agrele  :  pObjGcomfacl.gartfami_agrele,
                gartfami_codcta  :  pObjGcomfacl.gartfami_codcta,
                gartfami_codgru  :  pObjGcomfacl.gartfami_codgru,
                gartfami_codfis  :  pObjGcomfacl.gartfami_codfis,
                gartfami_sisamo  :  pObjGcomfacl.gartfami_sisamo
            });
        }
    }

    /**
     * calculate_head
     *
     * Is a class method that calculate head data amounts.
     * Among other things calculates.
     *      Net amount
     *      Tax data
     *      Automatic adjustment against supplier invoice.
     *      Payment dues.
     */
    calculate_head(pObjGcomfach, pObjCalcData) {

        function __getImploc(pBcimport, pBcLocFactor, pBcDivred) {
            if (pBcimport == 0 || pBcLocFactor == 0)
                return 0;

            return Ax.math.bc.scale(Ax.math.bc.mul(pBcimport, pBcLocFactor),
                pBcDivred,
                Ax.math.bc.RoundingMode.HALF_UP
            );
        }

        /**
         * LOCAL FUNCTION : __setDiffRound
         *
         *      This JS function calculates the difference between the total amount
         *      (imptot) and the invoice amount (impfac), and checks if it is within
         *      the limits of the difference amount (diff_amount) and the difference
         *      percentage (diff_porcen).
         *
         *      Rounding is done if:
         *
         *          . Amount of supplier invoiced is filled and is different
         *            from this.
         *          . An amount or percentage of rounding difference is defined,
         *            and is not exceeded.
         *
         *      Returns an object with the round amount and type_code.
         *
         *      @param {JSON}           pObjGcomfach        Document data
         *
         */
        function __setDiffRound(pObjGcomfach) {
            /**
             * Data returned.
             *  precio      Amount to round
             *  type_code   Tax type of line to insert
             */
            var mObjDiffReturn = {
                precio    : 0,
                type_code : null
            }

            /**
             * Obtains difference with suppplier invoice amount.
             */
            if (!Ax.math.bc.isZero(pObjGcomfach.imptot)) {
                var mBcDiffAmount = Ax.math.bc.sub(pObjGcomfach.impfac, pObjGcomfach.imptot);
                var mBcDiffPorcen = Ax.math.bc.mul(
                    Ax.math.bc.div(mBcDiffAmount, pObjGcomfach.imptot), 100
                );
            } else {
                return mObjDiffReturn;
            }

            /**
             * Gets the values of the difference amount (diff_amount) and the difference
             * percentage (diff_porcen).
             */
            var mObjDiffTolerance = {
                diff_amount : null,
                diff_porcen : null
            };

            /**
             * The values of difference amount (diff_amount) and/or difference
             * percentage (diff_porcen) are searched.
             *
             * Your search is performed in the following table order:
             *      1) gterdest
             *      2) gproveed
             *      3) gcomfacd
             *
             * The search in gterdest is by levels, the order of search is as follows:
             *      1. Company, local office, ship business and ship adress.
             *      2. Company, local office, ship business and ship adress = NULL.
             *      3. Company, local office '0', ship business and ship adress.
             *      4. Company, local office '0', ship business and ship adress = NULL.
             */
            var mRsGterdest = Ax.db.call("gterdest_GetData", pObjGcomfach);

            for (var mRowGterdest of mRsGterdest) {
                mObjDiffTolerance.diff_amount = (mRowGterdest.diff_amount != null ? mRowGterdest.diff_amount : mObjDiffTolerance.diff_amount);
                mObjDiffTolerance.diff_porcen = (mRowGterdest.diff_porcen != null ? mRowGterdest.diff_porcen : mObjDiffTolerance.diff_porcen);

                if (mObjDiffTolerance.diff_amount != null || mObjDiffTolerance.diff_porcen != null) break;
            }

            mRsGterdest.close();

            /**
             * If the amount of difference (diff_amount) and percentage of
             * difference(diff_porcen) are NULL, their values are looked up
             * in gproveed (in the main map).
             */
            if (mObjDiffTolerance.diff_amount == null && mObjDiffTolerance.diff_porcen == null) {
                mObjDiffTolerance.diff_amount = pObjGcomfach.gproveed_diff_amount;
                mObjDiffTolerance.diff_porcen = pObjGcomfach.gproveed_diff_porcen;
            }

            /**
             * If the amount of difference (diff_amount) and percentage of
             * difference(diff_porcen) are NULL, their values are looked up
             * in gcomfacd (in the main map).
             */
            if (mObjDiffTolerance.diff_amount == null && mObjDiffTolerance.diff_porcen == null) {
                mObjDiffTolerance.diff_amount = pObjGcomfach.document_diff_amount;
                mObjDiffTolerance.diff_porcen = pObjGcomfach.document_diff_porcen;
            }

            /**
             * It is validated that the rounding limit conditions are met, if the
             * conditions are not met, the process is terminated.
             */
            if ((mObjDiffTolerance.diff_amount == null ||
                 Ax.math.bc.compareTo(mObjDiffTolerance.diff_amount, Ax.math.bc.abs(mBcDiffAmount)) == -1) &&
                (mObjDiffTolerance.diff_porcen == null ||
                 Ax.math.bc.compareTo(mObjDiffTolerance.diff_porcen, Ax.math.bc.abs(mBcDiffPorcen)) == -1)
            ) {
                return mObjDiffReturn;
            }

            /**
             * Selects the
             */
            var mObjDiffLine = Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        gcomfacl.*, ctax_type.type_porcen, ctax_type.type_code
                    </columns>
                    <from table='gcomfacl'>
                        <join table='ctax_type'>
                            <on>(gcomfacl.tax_code1 = ctax_type.type_code OR
                                 gcomfacl.tax_code2 = ctax_type.type_code OR
                                 gcomfacl.tax_code3 = ctax_type.type_code OR
                                 gcomfacl.tax_code4 = ctax_type.type_code)
                            </on>
                            <join table='ctax_class'>
                                <on>ctax_type.type_class = ctax_class.class_code</on>
                                <on>ctax_class.class_type = 'N'</on>
                            </join>
                        </join>
                    </from>
                    <where>
                        gcomfacl.linid = ?
                    </where>
                </select>
            `, pObjCalcData.roundData.linid).toOne();

            /**
             * It is validated that there is at least one line.
             */
            if (mObjDiffLine.linid == null) {
                return mObjDiffReturn;
            }

            /**
             * Insert adjustment line.
             * Obtains price considering tax percentage, general discount,
             * and advance payment type.
             */
            mObjDiffLine.orden  = -999;
            mObjDiffLine.canfac = 1;
            mObjDiffLine.canpre = 1;
            mObjDiffLine.precio = mBcDiffAmount;
            mObjDiffLine.dtoli1 = null;
            mObjDiffLine.dtoli2 = null;
            mObjDiffLine.dtoli3 = null;
            mObjDiffLine.dtoimp = null;
            mObjDiffLine.indmod = "N";
            mObjDiffLine.linrel = null;
            mObjDiffLine.linori = null;
            mObjDiffLine.cabori = null;
            mObjDiffLine.tabori = null;
            mObjDiffLine.diff_type      = null;
            mObjDiffLine.diff_concep    = null;
            mObjDiffLine.diff_date_exec = null;
            mObjDiffLine.linid  = 0;

            if (!Ax.math.bc.isZero(pObjGcomfach.dtogen) ||
                !Ax.math.bc.isZero(pObjGcomfach.dtopp)  ||
                !Ax.math.bc.isZero(mObjDiffLine.type_porcen)
            ) {
                mObjDiffLine.precio = Ax.math.bc.div(
                    Ax.math.bc.mul(mBcDiffAmount, 1000000),
                    Ax.math.bc.mul(
                        Ax.math.bc.add(100, mObjDiffLine.type_porcen),
                        Ax.math.bc.sub(100, pObjGcomfach.dtogen),
                        Ax.math.bc.sub(100, pObjGcomfach.dtopp)
                    )
                );
            }

            mObjDiffReturn.precio    = mObjDiffLine.precio;
            mObjDiffReturn.type_code = mObjDiffLine.type_code;

            delete mObjDiffLine.type_porcen;
            delete mObjDiffLine.type_code;

            mObjDiffLine.impnet = mObjDiffLine.precio;
            mObjDiffLine.linori = null;

            Ax.db.insert("gcomfacl", mObjDiffLine);

            /**
             * Return adjusment amount and tax type.
             */
            return mObjDiffReturn;
        }

        var log_calculate_head = this.log_gcomfacl.addTable("Calculate Head", ["Method", "message"]);

        /**
          *  Main block
         **/
        var mObjGcomfach = pObjGcomfach;
        
        
        
        /**
          *  If is there any footer line with account distribution, resets gvenfacl_datc
         **/
        if (mObjGcomfach.account_dis) {
            Ax.db.executeProcedure("gcomfacl_set_docfoot_datc", mObjGcomfach.cabid, mObjGcomfach.base_discount);
        }

        /**
          *  If invoice is accounted, return. Dont change amounts.
         **/
        if (mObjGcomfach.date_contab) {
            return;
        }

        /**
         * The types of invoice difference are verified and
         * the diff_type is updated in gcomfacl
         */
        if (pObjGcomfach.document_diffdlv == 1) {
            Ax.db.executeProcedure("gcomfach_get_difftype",
            pObjGcomfach.cabid, null);
        }

        /**
          *  Exists manual Taxes. If change gross amount, not considere manual taxes.
         **/
        var mBoolManualTaxes = (Ax.math.bc.compareTo(mObjGcomfach.fach_gross_prv, mObjGcomfach.fach_gross) == 0 && mObjGcomfach.tax_manual != 0);

        /**
          *  Apply advance payments if taxes has not been updated manually.
          *
          *  Values of gcomfacd.indant.
          *     [N]     Do anythging
          *     [G]     Generate advance payments
          *     [M]     Manual consumptions on advance payments
          *     [A]     Automatic consumptons on advance payments
          *
          */
         var mBoolApplyAdvances = (mObjGcomfach.document_indant != 'N' && !mBoolManualTaxes);
         
         /**
          * CUSTOM CRP 26/11/2024 (JPY): La regeneraciòn de anticipos no depende de la existencia de
          * impuestos manuales.
          */
         //var mBoolApplyAdvances = (mObjGcomfach.document_indant != 'N');

        /**
          *  Delete advance payments generated automatically before.
          *  Document amount can be lower than previous.
         **/
         if (mBoolApplyAdvances) {
            log_calculate_head.addRow(['gcomantl_delete', "Delete advance payments generated automatically before."]);

            Ax.db.executeProcedure(
                "gcomantl_delete",
                "gcomfach",
                mObjGcomfach.cabid,
                mObjGcomfach.docser,
                mObjGcomfach.tipdoc,
                mObjGcomfach.docori,
                null
            );

            /**
              *  After delete taxes rows, Value of impant_ntax can be different
             **/
             mObjGcomfach.impant_ntax = Ax.db.executeGet(`
                <select>
                    <columns>
                        impant_ntax
                    </columns>
                    <from table='gcomfach' />
                    <where>
                        gcomfach.cabid = ?
                    </where>
                </select>
            `, mObjGcomfach.cabid);
        }

        /**
          *  If exists special discounts, update gcommovh_dtcl.import
          *  from resultset
         **/
        if (mObjGcomfach.document_dtoesp == 'S' && pObjCalcData.headDtos) {
            var mRsHeadDtos = pObjCalcData.headDtos;
			var batchDctcl = Ax.db.updateBatch("gcomfach_dtcl");

            for (var mRowHeadDtos of mRsHeadDtos) {
				batchDctcl.addBatch(
					 {"import" : mRowHeadDtos.import
					 },
					 {"cabid"  : mObjGcomfach.cabid,
					  "coddto" : mRowHeadDtos.coddto,
					  "orden"  : mRowHeadDtos.orden}
				);
            }
            batchDctcl.close();
        }
        
        
        
        /**
          * Calculates invoice amount.
          * The loop is done for to adjust differences with supplier invoice.
          *
          * In first loop we calculate invoice without any adjustment. Check
          * difference againts supplier invoice and generate adjustment line.
          *
          * In second loop, calculate againt imposable bases and total amount,
          * and turn to check differences against the supplier invoice. If already
          * exists a difference, modify directly the base or quote of head
          * tax data corresponding to previous adjustment line.
         **/
        for (var mIntIdx = 1; mIntIdx < 3; mIntIdx++) {
            mObjGcomfach.tot_quote = 0;
            mObjGcomfach.tot_VAT   = 0;
            mObjGcomfach.tot_RET   = 0;
            mObjGcomfach.tot_DET   = 0;

            /**
              * If one or more taxes registers has been modified manually,
              * create resulset directly from invoice tax data.
              * Otherwise calculates aggregates tax rows from tax data lin
              * invoice lines.
              *
              * At end we calculate:
              *     Total TAX quote
              *     Total VAT quote
              *     Total Retention quote.
             **/
            if (!mBoolManualTaxes) {
                log_calculate_head.addRow(["delete gcomfach_tax", ""]);

                Ax.db.delete("gcomfach_tax", {cabid : mObjGcomfach.cabid });

                log_calculate_head.addRow(["gcomfach_tax_GetData", "Obtains all tax bases and quotes from a purchase invoice"]);

                Ax.db.call(
                    'gcomfach_tax_GetData',
                    mObjGcomfach
                );
            }

            mObjGcomfach.net_amount = 0;

            var mRsGcomfachTax = Ax.db.executeQuery(`
                <select>
                    <columns>
                        gcomfach_tax.*,
                        ctax_class.class_type tax_class,
                        ctax_class.class_order
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
                        gcomfach_tax.cabid = ?
                    </where>
                </select>
            `, mObjGcomfach.cabid).toMemory();

            /**
             * CUSTOM CRP 13-03-2023: De forma estandar el importe neto (net_amount)
             * acumula valor solo si existe impuesto de tipo N, pero en Perú los
             * recibos por honorarios (registrados como facturas) no tienen impuestos
             * de tipo N (IGV) y sí sólo Retenciones, en ese caso, la acumulación
             * del importe neto ha de ir a partir de la base imponible del impuesto
             * de tipo R.
             */
            var mBoolHasNoTax = mRsGcomfachTax.rows().select(row => {
                return row.getString("tax_class") == "N";
            }).getRowCount() == 0;

            /**
             *  tot_quote => Sum of tax quote for all tax types and classes
             *  tot_VAT   => Sum of class N (Normal VAT) and class E (Equalization tax)
             *  tot_RET   => Sum of retention tax
             *  tot_DET   => Sum of detraction tax
             **/
            for (let mRowGcomfachTax of mRsGcomfachTax) {
                /**
                 * Cause not validated (Regenerated taxes)
                 */
                if (mRowGcomfachTax.tax_valori != 0) {
                    mObjGcomfach.taxnval = true;
                }

                if ((mRowGcomfachTax.tax_class == 'N') ||
                    (mRowGcomfachTax.tax_class == 'R' && mBoolHasNoTax)) {
                    mObjGcomfach.net_amount = Ax.math.bc.add(
                        mObjGcomfach.net_amount, mRowGcomfachTax.tax_basimp, mRowGcomfachTax.tax_basnimp
                    );
                }

                /**
                 * CUSTOM CRP 20-10-2022: La detracciones y retenciones no se 
                 * descuentan del importe total en Perú.
                 */
                if (!(mRowGcomfachTax.tax_class == 'D' ||
                        mRowGcomfachTax.tax_class == 'R')) {
                    mObjGcomfach.tot_quote = Ax.math.bc.add(mObjGcomfach.tot_quote,
                            mRowGcomfachTax.tax_cuoded, mRowGcomfachTax.tax_cuonded);
                }

                // if (mRowGcomfachTax.tax_class == 'N' || mRowGcomfachTax.tax_class == 'E')
                //     mObjGcomfach.tot_VAT = Ax.math.bc.add(mObjGcomfach.tot_VAT,
                //               mRowGcomfachTax.tax_cuoded, mRowGcomfachTax.tax_cuonded);

                if (mRowGcomfachTax.tax_class == 'R') {
                    mObjGcomfach.tot_RET = Ax.math.bc.add(mObjGcomfach.tot_RET,
                              mRowGcomfachTax.tax_cuoded, mRowGcomfachTax.tax_cuonded);
                }

                if (mRowGcomfachTax.tax_class == 'D') {
                    mObjGcomfach.tot_DET = Ax.math.bc.add(mObjGcomfach.tot_DET,
                              mRowGcomfachTax.tax_cuoded, mRowGcomfachTax.tax_cuonded);
                }
            }
console.log("mObjGcomfach.imptot", mObjGcomfach.imptot)
			mObjGcomfach.imptot = Ax.math.bc.add(mObjGcomfach.net_amount, mObjGcomfach.tot_quote);
			

            /**
              * Substracts impant_ntax from imptot if advances without taxes exist
              */
            if (mBoolApplyAdvances) {
                mObjGcomfach.imptot = Ax.math.bc.sub(mObjGcomfach.imptot, mObjGcomfach.impant_ntax == null ? 0 : mObjGcomfach.impant_ntax);
console.log("mObjGcomfach.imptot next", mObjGcomfach.imptot)
            }
            
            
            
            /**
              * Exists rounding differences.
              * __setDiffRound checks if automic rounding adjustment is setted
              *
              */
            if (mIntIdx > 1                                     &&
                Ax.math.bc.compareTo(mObjGcomfach.impfac, mObjGcomfach.imptot) != 0 &&
               !Ax.math.bc.isZero(mObjGcomfach.impfac)          &&
               !Ax.math.bc.isZero(mObjGcomfach.imptot)) {

                var mBcDiffRound = Ax.math.bc.sub(mObjGcomfach.impfac, mObjGcomfach.imptot);

                /**
                 * If program generated a round adjustment item in loop 1, but already exists
                 * a little difference (the reason is the number of currency digits),
                 * we adjust directly the tax amounts in gcomfach_tax. We try to adjust tax quote if
                 * is different from zero, or the imposable base if quote is zero.
                 */
                if (mObjDiffRound) {
                    for (var mRowGcomfachTax of mRsGcomfachTax) {
                        if (mRowGcomfachTax.tax_code != mObjDiffRound.type_code) {
                            continue;
                        }

                        if ((Ax.math.bc.isZero(mRowGcomfachTax.tax_cuoded)) &&
                            (Ax.math.bc.isZero(mRowGcomfachTax.tax_basimp))) {
                            continue;
                        }

                        if (!Ax.math.bc.isZero(mRowGcomfachTax.tax_cuoded)) {
                            var mBcAmount = Ax.math.bc.add(mRowGcomfachTax.tax_cuoded, mBcDiffRound);
                            Ax.db.update("gcomfach_tax",
                                { tax_cuoded : mBcAmount, tax_cuosrc : mBcAmount },
                                { tax_seqno  : mRowGcomfachTax.tax_seqno         }
                            );
                            mObjGcomfach.tot_quote = Ax.math.bc.add(mObjGcomfach.tot_quote, mBcDiffRound);

                        } else {

                            var mBcAmount = Ax.math.bc.add(mRowGcomfachTax.tax_basimp, mBcDiffRound);
                            Ax.db.update("gcomfach_tax",
                                { tax_basimp : mBcAmount,tax_bassrc : mBcAmount },
                                { tax_seqno : mRowGcomfachTax.tax_seqno          }
                            );
                            mObjGcomfach.net_amount = Ax.math.bc.add(mObjGcomfach.net_amount, mBcDiffRound);
                       }
                        mObjGcomfach.imptot     = Ax.math.bc.add(mObjGcomfach.imptot,     mBcDiffRound);
                        
                        
                    }
                }
            }
            
            
			/**
			 * CRP[27-05-2024]
			 * - Se traslada a este nivel la suma de impuestos de clase N y E, para hacer uso
			 *   del tax_cuoded actualizado por la diferencia de redondeo.
			 * 
			 *  tot_VAT   => Sum of class N (Normal VAT) and class E (Equalization tax)
			*/
			var mRsGcomfachTax_2 = Ax.db.executeQuery(`
                <select>
                    <columns>
                        gcomfach_tax.*,
                        ctax_class.class_type tax_class,
                        ctax_class.class_order
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
                        gcomfach_tax.cabid = ?
                    </where>
                </select>
            `, mObjGcomfach.cabid).toMemory();

            for (let mRowGcomfachTax of mRsGcomfachTax_2) { 
				if (mRowGcomfachTax.tax_class == 'N' || mRowGcomfachTax.tax_class == 'E')
                    mObjGcomfach.tot_VAT = Ax.math.bc.add(mObjGcomfach.tot_VAT,
                              mRowGcomfachTax.tax_cuoded, mRowGcomfachTax.tax_cuonded);
			}
			mRsGcomfachTax_2.close();
            
            if (mIntIdx > 1                                     ||
                mBoolManualTaxes                                ||
                mObjGcomfach.impfac.equals(mObjGcomfach.imptot) ||
                Ax.math.bc.isZero(mObjGcomfach.impfac)          ||
                Ax.math.bc.isZero(mObjGcomfach.imptot)) {
                break;
            }

            log_calculate_head.addRow(["__setDiffRound", "Insert rounding lines"]);

            var mObjDiffRound = __setDiffRound(mObjGcomfach);
            if (Ax.math.bc.isZero(mObjDiffRound.precio))
                break;

            mObjGcomfach.fach_gross = Ax.math.bc.add(mObjGcomfach.fach_gross, mObjDiffRound.precio);
            
            
        }
        
        
        
        /**
         * Assign [A]utomatic advanced payments in case of invoice type not
         * having any origin document (document_tabori == null). Otherwise,
         * transfer those reservations applied to the origin documents (can be
         * multiple because it is linked by lines). The taxes are updated via
         * batch inside the functions, gcomfach.impant and gcomfach.impant_ntax
         * get updated by gcomantl trigger. gcomfach.imptot value gets stored
         * into mObjGcomfach.imptot, to be updated, later on, in this script.
         */
         if (mBoolApplyAdvances) {
            
            Ax.db.call("gcomfach_Gcomantl", mObjGcomfach);
            
         }
        
        
        
        /**
          * Obtains payment dues if not exists.
          * If one of this has been changed regenerate
          * payment dues again "imptot, tipefe, frmpag, impant, valor"
          **/
        var mBoolCalcGcomface = (mObjGcomfach.exist_gcomface == 0);

        if (!mBoolCalcGcomface) {
            var mObjChanged = mObjGcomfach.getChanged();
            if (
                mObjChanged.imptot !== undefined ||
                mObjChanged.tipefe !== undefined ||
                mObjChanged.frmpag !== undefined ||
                mObjChanged.impant !== undefined ||
                mObjChanged.valor  !== undefined ||
                
                /**
                 * CUSTOM CRP 03-04-2024 (JPY): Cuando un impuesto se modifica manualmente
                 * conviene recalcular los vencimientos con los importes actualizados.
                 **/
                mObjGcomfach.tax_manual

            ) {
                Ax.db.delete("gcomface", {cabid : mObjGcomfach.cabid });
                mBoolCalcGcomface = true;
            }
        }
        
        
        
        /**
          * Obtains amounts in local currency.
          **/
        if (mBoolCalcGcomface) {

            var mBcImptotLoc = __getImploc(mObjGcomfach.imptot,
                mObjGcomfach.divloc_factor, mObjGcomfach.cmonedas_tipred);

            var mBcTot_VATLoc = __getImploc(mObjGcomfach.tot_VAT,
                    mObjGcomfach.divloc_factor, mObjGcomfach.cmonedas_tipred);

            var mBcTot_RETLoc = __getImploc(mObjGcomfach.tot_RET,
                    mObjGcomfach.divloc_factor, mObjGcomfach.cmonedas_tipred);

            var mBcTot_DETLoc = __getImploc(mObjGcomfach.tot_DET,
                    mObjGcomfach.divloc_factor, mObjGcomfach.cmonedas_tipred);

            var mArrGcomface = [];

            /**
             * CUSTOM CRP 25-07-2023: En el cálculo de vencimientos el importe
             * total ya debe tener reducido el importe de retención.
             */
            var mBcImptotLocVTO = Ax.math.bc.add(mBcImptotLoc, mBcTot_RETLoc);
            var mBcImptotDivVTO = Ax.math.bc.add(mObjGcomfach.imptot, mObjGcomfach.tot_RET);

            var mArrVencim = Ax.db.call('icon_vtos_genera',
                   mObjGcomfach.empcode,
                   mObjGcomfach.tercer,
                   'P',
                   mObjGcomfach.valor,
                   mObjGcomfach.tipefe,
                   null,
                   mObjGcomfach.frmpag,
                   mObjGcomfach.divisa,
                   mBcImptotLocVTO,         //mBcImptotLoc
                   mBcImptotDivVTO,         //mObjGcomfach.imptot
                   mBcTot_VATLoc,
                   mBcTot_RETLoc * -1,
                   mBcTot_DETLoc * -1,
                   null,
                   'gcomface',
                   mObjGcomfach.cabid,
                   mObjGcomfach.taxnval,
                   0);
            
            /**
             * CUSTOM CRP 20-06-2024: Para los facturas vinculadas a un albaran
             * con tipologia pertenecientes al circuito HM se obtiene la fecha
             * de vencimiento del campo auxchr2
             */
            var mObjAlbaranOrigen = Ax.db.executeQuery(`
				<select first='1'>
					<columns>
						gcommovh.auxchr2,
						gcommovh.tipo_produccion_ifas,
						gcommovh.concep_fact_tipo_ifas
					</columns>
					<from table='gcomfach'>
						<join table ='gcomfacl'>
							<on>gcomfach.cabid = gcomfacl.cabid</on>
							<join table='gcommovh'>
								<on>gcomfacl.cabori = gcommovh.cabid</on>
								<join table='gcommovd'>
									<on>gcommovh.tipdoc = gcommovd.codigo</on>
								</join>
							</join>
						</join>
					</from>
					<where>
						gcomfach.cabid = ?
						AND gcommovd.circui = 'HM'
					</where>
				</select>
				`,mObjGcomfach.cabid).toOne();
			
			if(mObjAlbaranOrigen.auxchr2){
			    var mDateVencimHm = new Ax.sql.Date(mObjAlbaranOrigen.auxchr2)
			    
			    /* Remplazamos la fecha de vencimiento en la factura */
                Ax.db.update("gcomfach",
                    { 
                        auxnum5                 : mDateVencimHm, 
                        tipo_produccion_ifas    : mObjAlbaranOrigen.tipo_produccion_ifas, 
                        concep_fact_tipo_ifas   : mObjAlbaranOrigen.concep_fact_tipo_ifas 
                    },
                    { cabid   : mObjGcomfach.cabid }
                );
			}       
                   

            for (let mRowVencim of mArrVencim) {
                var mRowsGcomface = {
                    cabid  : mObjGcomfach.cabid,
                    tipefe : mRowVencim.tipefe,
                    fecven : mDateVencimHm||mRowVencim.fecven,
                    imploc : mRowVencim.import,
                    impdiv : mRowVencim.impdiv,
                    impiva : mRowVencim.impiva,
                    impret : mRowVencim.impret,
                    codppa : mRowVencim.codppa,
                    indret : (Ax.math.bc.isZero(mRowVencim.impret) ? 0 : 1),
                    taxnval: mRowVencim.taxnval,
                    codper : mRowVencim.codper,
                    numban : mRowVencim.numban
                }

                mArrGcomface.push(mRowsGcomface);
            }

            Ax.db.insert("gcomface", mArrGcomface);
        }
        
        

        /**
         * Generación de desglose en líneas de los descuentos de cabecera
         * por importe global .
         */
        if (mObjGcomfach.document_dtoesp == "S" && mObjGcomfach.exist_global_discounts) {
            /**
             * Avoid proration on gift lines
             */
            var mRsLineData = Ax.db.executeQuery(
                Ax.lang.String.format(pObjCalcData.gcomfaclSQL,
                    `AND gcomfacl.regalo != 'M' AND (gcomfacl.regalo != 'S' OR gcomfacl.dtoli1 != -100)`),
                mObjGcomfach.cabid
            );

            Ax.db.call("gcom_GlobalDiscount",
                mObjGcomfach,
                mObjGcomfach.fach_gross,
                mRsLineData,
                pObjCalcData.priceLists,
                pObjCalcData.headDtos
            );

            mRsLineData.close();
        }
        
    }

    /**
     *
     *  validate_post
     *
     *  Class method than executes all operations that must be done
     *  when finish invoice validation and calculation.
     *
     *  As yet do:
     *
     *      Generation of fixed assets
     *      Generation of budget movements
     *
     */
    validate_post(pObjGcomfach, pObjCalcData) {

        if (pObjGcomfach.docproc) {
            /**
             * We retrieve the process identifier (docproc); if it is in
             * lower case, then it corresponds to a process to be executed,
             * if it is in upper case, it corresponds to a process that has
             * already been executed and will not be executed again.
             */
            var mStrDocproc = this.getDocproc();

            /**
             * Generate fixed assets.
             */
            if (mStrDocproc.indexOf("i") != -1 && pObjGcomfach.estcab == "V") {

                Ax.db.call("gdoc_GenAssets", "gcomfach", "gcomfacl", pObjGcomfach.cabid,
                            pObjCalcData.assetData);

                mStrDocproc = mStrDocproc.replace("i", "I");
            }

            /**
             * Generate budgets movements.
             */
            if ((pObjGcomfach.document_cominv == 'S' && pObjGcomfach.estcab == "V") ||
                 pObjGcomfach.document_cominv == "E") {
                if (mStrDocproc.indexOf("p") != -1) {
                    Ax.db.call("gcomfach_SetCpremovi", pObjGcomfach, pObjCalcData.arr_cabori);

                    mStrDocproc = mStrDocproc.replace("p", "P");
                }
            }

            /**
             * Generation cost delivery notesgcomfach_workflow
             */
            if (mStrDocproc.indexOf("w") != -1) {
                Ax.db.call("g_docfoot_GenGcommovh", pObjGcomfach, pObjCalcData.mRsGcomfacl);

                mStrDocproc = mStrDocproc.replace("w", "W");
            }

            /**
             * Final update
             */
            if (mStrDocproc != pObjGcomfach.docproc) {
                Ax.db.update("gcomfach",
                    { docproc : mStrDocproc },
                    { cabid   : pObjGcomfach.cabid }
                );
            }
        }
    }


    /**
     * Execute the workflow Rule validation for given serial on table
     *
     *      @param      pIntCabid
     *      @param      mObjGcomfach
     */
    execute(pIntCabid) {

        // =====================================================================
        // LOAD DATA gcomfach
        // =====================================================================
        var mObjGcomfach = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfach.*,
                    fach_gross      fach_gross_prv,

                    CASE WHEN gcomfach.divisa = cempresa.divemp
                         THEN 1
                         ELSE icon_get_decloc(0,
                                              gcomfach.empcode,
                                              gcomfach.divisa,
                                              gcomfach.fecha,
                                              gcomfach.cambio,
                                              1,
                                              99)
                     END        divloc_factor,

                    gcomfacd.dtoesp  document_dtoesp,  gcomfacd.tipwkf  document_tipwkf,
                    gcomfacd.indant  document_indant,  gcomfacd.albcdf  document_albcdf,
                    gcomfacd.copori  document_copori,  gcomfacd.cartype document_cartype,
                    gcomfacd.impdoc  document_impdoc,  gcomfacd.estado  document_estado,
                    gcomfacd.regest  document_regest,  gcomfacd.abono   document_abono,
                    gcomfacd.cominv  document_cominv,  gcomfacd.albvdf  document_albvdf,
                    gcomfacd.tabori  document_tabori,  gcomfacd.geninm  document_geninm,
                    gcomfacd.diffdlv document_diffdlv, gcomfacd.valdoc  document_valdoc,
                    gcomfacd.nattra  document_nattra,  gcomfacd.datcon  document_datcon,
                    gcomfacd.ivainc  document_ivainc,  gcomfacd.abono   document_abono,
                    gcomfacd.diff_amount document_diff_amount,
                    gcomfacd.diff_porcen document_diff_porcen,
                    gcomfacd.getacu document_getacu,   gcomfacd.tipado  document_tipado,
                    gcomfacd.albfoot document_albfoot,

                    <nvl>gproveed.tipred, icon_get_divred(gcomfach.divisa)</nvl> cmonedas_tipred,

                    gproveed.estges  gproveed_estges,  gproveed.grpemp  gproveed_grpemp,
                    gproveed.estado  gproveed_estado,  gproveed.fecbaj  gproveed_fecbaj,
                    gproveed.tarpre  gproveed_tarpre,  gproveed.tardtg  gproveed_tardtg,
                    gproveed.diff_amount gproveed_diff_amount,
                    gproveed.diff_porcen gproveed_diff_porcen,
                    gproveed.tardtf  gproveed_tardtf,  gproveed.clasif gproveed_clasif,
                    icon_get_imploc(0,
                                    gcomfach.empcode,
                                    gproveed.divisa,
                                    gcomfach.fecha,
                                    <cast type='decimal'>null</cast>,
                                    gproveed.minped) gproveed_minped,

                    ctercero.estado  ctercero_estado,
                    ctercero_fac.cif ctercero_cif,     ctercero_fac.nombre ctercero_nombre,

                    gdelegac.estado  gdelegac_estado,  gdelegac.fecbaj  gdelegac_fecbaj,

                    gdeparta.estado  gdeparta_estado,  gdeparta.proyec  gdeparta_proyec,
                    gdeparta.seccio  gdeparta_seccio,  gdeparta.ctaexp  gdeparta_ctaexp,
                    gdeparta.centro  gdeparta_centro,

                    cempresa.estado  cempresa_estado,  cempresa.fecfin cempresa_fecfin,
                    cempresa.divemp  cempresa_divemp,

                    ctipoefe.domban ctipoefe_domban,
                    ctipopag.frmpag ctipopag_frmpag,

                    <nvl>gdeparta.codcat, gdelegac.codcat</nvl> codcat,

                    EXISTS(SELECT gcomfach_tax.cabid FROM gcomfach_tax
                            WHERE gcomfach_tax.cabid = gcomfach.cabid AND
                                  tax_valori != 0)                   taxnval,

                    EXISTS(SELECT gcomfach_tax.cabid FROM gcomfach_tax
                            WHERE gcomfach_tax.cabid = gcomfach.cabid AND
                                  tax_manual != 0)                   tax_manual,

                    EXISTS(SELECT gcomface.cabid FROM gcomface
                            WHERE gcomface.cabid = gcomfach.cabid)   exist_gcomface,

                    EXISTS(SELECT gcomfach_dtcl.cabid FROM gcomfach_dtcl
                            WHERE gcomfach_dtcl.cabid  = gcomfach.cabid AND
                                  gcomfach_dtcl.formul = 'G')        exist_global_discounts

                </columns>
                <from table='gcomfach'>
                    <join table='gcomfacd'>
                        <on>gcomfach.tipdoc = gcomfacd.codigo</on>
                    </join>
                    <join type='left' table='gproveed'>
                        <on>gcomfach.tercer = gproveed.codigo</on>
                        <join type='left' table='ctercero'>
                            <on>gproveed.codigo = ctercero.codigo</on>
                        </join>
                    </join>
                    <join type='left' table='ctercero' alias='ctercero_fac'>
                        <on>gcomfach.terfac = ctercero_fac.codigo</on>
                    </join>
                    <join type='left' table='gdelegac'>
                        <on>gcomfach.delega = gdelegac.codigo</on>
                    </join>
                    <join type='left' table='gdeparta'>
                        <on>gcomfach.delega = gdeparta.delega</on>
                        <on>gcomfach.depart = gdeparta.depart</on>
                    </join>
                    <join type='left' table='cempresa'>
                        <on>gcomfach.empcode = cempresa.empcode</on>
                    </join>
                    <join type='left' table='ctipoefe'>
                        <on>ctipoefe.codigo = gcomfach.tipefe</on>
                        <on>ctipoefe.clase  = 'P'</on>
                    </join>
                    <join type='left' table='ctipopag'>
                        <on>gcomfach.frmpag = ctipopag.codigo</on>
                    </join>
                </from>
                <where>
                    gcomfach.cabid = ?
                </where>
            </select>
        `, pIntCabid).toOne().setRequired(`gcomfach.cabid = ${pIntCabid} not found`);

        // =====================================================================
        // Add Header Log
        // =====================================================================
        this.log_gcomfach.addRow([mObjGcomfach.cabid, mObjGcomfach.docser, mObjGcomfach.tercer, mObjGcomfach.fecha]);

        // Propiedades usadas en Workflows
        mObjGcomfach.tabnameh      = 'gcomfach';
        mObjGcomfach.tabnamel      = 'gcomfacl';
        mObjGcomfach.clase         = 'P';
        mObjGcomfach.exist_lines   = false;
        mObjGcomfach.codtip        = mObjGcomfach.clase;
        mObjGcomfach.base_discount = 0;
        mObjGcomfach.base_dtopp    = 0;
        mObjGcomfach.isKit         = false; //para estandarizar con los otros workflow
        mObjGcomfach.account_dis   = false;
        
        
        
        // =====================================================================
        // Load head map
        // =====================================================================
        this.setHeadData(mObjGcomfach);

        //=====================================================================
        // Init docproc
        // =====================================================================
        this.initDocproc(mObjGcomfach.docproc);

        //=====================================================================
        // Previsous to all document validation
        //
        // Obtains all tariffs
        // Load head discounts
        // =====================================================================
        var mObjCalcData = this.validate_prev(mObjGcomfach);
        
        
        
        /**
         * Recorrer gcomfacl
         */
        this.log_gcomfacl = this.log_gcomfach.addTable("Lines", ["linid", "codart", "varlog"]);

        var mStrGcomfacl = `
            <select>
                <columns>
                    gcomfacl.*,
                    gcomfacl.udmcom udmdoc,
                    gcomfacl.udmcom udm1,
                    gcomfacl.udmcom udm2,
                    gcomfacl.udmcom udm3,
                    gcomfacl.canfac cantid,
                    ROUND(gcomfacl.impnet / gcomfacl.canpre, 6) prenet,
                    CASE WHEN gcomfacl.udmcom = garticul.udmbas AND garticul.udmaux IS NULL
                         THEN gcomfacl.canfac
                         ELSE gart_unidefs_get_cancost(0,
                                    gcomfacl.codart, gcomfacl.varlog, gcomfacl.udmcom,
                                    garticul.udmaux, gcomfacl.canfac, NULL)
                     END cancost,

                    garticul.nomart  garticul_nomart, garticul.udmbas  garticul_udmbas,
                    garticul.grpemp  garticul_grpemp, garticul.estado  garticul_estado,
                    garticul.fecbaj  garticul_fecbaj, garticul.difalb  garticul_difalb,
                    garticul.estges  garticul_estges, garticul.agrpre  garticul_agrpre,
                    garticul.codfam  garticul_codfam, garticul.albfoot garticul_albfoot,
                    garticul.terfoot garticul_terfoot,

                    CASE WHEN <length>gartvarl.fabric</length> > 0
                         THEN gartvarl.fabric
                         ELSE garticul.fabric
                    END garticul_fabric,

                    garticul.marca garticul_marca,  garticul.modelo garticul_modelo,

                    gartvarl.estado gartvarl_estado, gartvarl.fecbaj gartvarl_fecbaj,
                    gartfami.estado gartfami_estado, gartfami.fecbaj gartfami_fecbaj,
                    gartfami.codinm gartfami_codinm, gartfami.serele gartfami_serele,
                    gartfami.agrele gartfami_agrele, gartfami.codcta gartfami_codcta,
                    gartfami.codgru gartfami_codgru, gartfami.codfis gartfami_codfis,
                    gartfami.sisamo gartfami_sisamo,

                    gcomfacl_dtlh.regesc dtlh_regesc,

                    CASE WHEN gcomfacl_dtlh.linid IS NOT NULL
                         THEN 1
                         ELSE 0
                     END exist_dtlh,

                    EXISTS(SELECT gcomfacl_dtll.linid FROM gcomfacl_dtll
                            WHERE gcomfacl_dtll.linid = gcomfacl.linid
                              AND gcomfacl_dtll.headdt != 0) 			   dtcl_splited,

                     EXISTS(SELECT gcomfacl_datc.linid FROM gcomfacl_datc
                             WHERE gcomfacl_datc.linid = gcomfacl.linid) exist_datc
                </columns>
                <from table='gcomfacl'>
                    <join table='garticul'>
                        <on>gcomfacl.codart = garticul.codigo</on>
                    </join>
                    <join table='gartfami'>
                        <on>garticul.codfam = gartfami.codigo</on>
                    </join>
                    <join type='left' table='gartvarl'>
                        <on>gcomfacl.codart = gartvarl.codart</on>
                        <on>gcomfacl.varlog = gartvarl.varlog</on>
                    </join>
                    <join type='left' table='gcomfacl_dtlh'>
                        <on>gcomfacl.linid = gcomfacl_dtlh.linid</on>
                    </join>
                </from>
                <where>
                    gcomfacl.cabid = ? %s
                </where>
                <order>
                    gcomfacl.linid
                </order>
            </select>
        `;

        var mRsGcomfacl = Ax.db.executeQuery(Ax.lang.String.format(mStrGcomfacl, ""), pIntCabid).toMemory();

        for (var mRowGcomfacl of mRsGcomfacl) {
            this.log_gcomfacl.addRow([mRowGcomfacl.linid, mRowGcomfacl.codart, mRowGcomfacl.varlog]);

            mObjGcomfach.exist_lines = true;

            /**
             * Validate gcomfacl
             */
            this.calculate_line(mObjGcomfach, mRowGcomfacl, mObjCalcData);

            /**
             * Validate gcomfacl
             */
            this.validate(mObjGcomfach.document_tipwkf, pIntCabid, mRowGcomfacl.linid, mRowGcomfacl);

            if (mRowGcomfacl.hasChanged()) {
                Ax.db.update('gcomfacl', mRowGcomfacl.getChanged(), `linid = ${mRowGcomfacl.linid}`);
            }
        }
        
        
        
        mObjCalcData.gcomfaclSQL = mStrGcomfacl;
        mObjCalcData.mRsGcomfacl = mRsGcomfacl;

        mRsGcomfacl.close();

        this.flush();
        /**
         * Previous to validate head (gcomfach)
         *
         *   Obtains total invoice amounts
         *   Apply advance payments
         *   Calc taxes
         *   Calc payment dues
         */
        
        
        
        // console.log(`PREVIOUS TO HEAD VALIDATION [${pIntCabid}]`);
        // console.log(`----------------------------------`);
        this.calculate_head(mObjGcomfach, mObjCalcData);
        
        
        
        /**
         * Workflow validate gcomfach
         */
        // console.log(`VALIDATE HEAD gcomfach [${pIntCabid}]`);
        // console.log(`----------------------------------`);

        this.validate(mObjGcomfach.document_tipwkf, pIntCabid, 0, mObjGcomfach);
        this.flush();
        
        

        /**=====================================================================
         * WORKFLOW ENGINE
         * =====================================================================
         */
        // console.log(``);
        // console.log(`WORKFLOW HEAD gcomfach`);
        // console.log(`----------------------`);
        this.workflow(mObjGcomfach.document_tipwkf, pIntCabid, 0, mObjGcomfach);
        
        
        
        /**
         * Recorrer gcomfacl
         */
        // console.log(``)
        // console.log(`WORKFLOW LINE gcomfacl`);
        // console.log(`----------------------`);

        if (this.getPendingValidations() != 0) {
            var mRsGcomfacl = Ax.db.executeQuery(
                Ax.lang.String.format(mStrGcomfacl,
                    `AND EXISTS (SELECT cworkflow_val_log.log_linid
                               FROM cworkflow_val_log
                              WHERE cworkflow_val_log.log_linid = gcomfacl.linid
                                AND cworkflow_val_log.log_table = 'gcomfach'
                                AND cworkflow_val_log.log_state = 'P')`),
                pIntCabid
            );

            for (var mRowGcomfacl of mRsGcomfacl) {

                /**
                 * Validate gcomfacl
                 */
                this.workflow(mObjGcomfach.document_tipwkf, pIntCabid, mRowGcomfacl.linid, mRowGcomfacl);


                if (mRowGcomfacl.hasChanged()) {

                    // La validacion no machaca los datos de los usuarios originales de modificacion
                    // mObjGcomfacl.user_updated = Ax.db.getUser();
                    // mObjGcomfacl.date_updated = new Ax.sql.Date();
                    //Ax.db.update('gcomfacl', mRowGcomfacl.getChanged(), `linid = ${mRowGcomfacl.linid}`);
                    Ax.db.update('gcomfacl',
                         mRowGcomfacl.getChanged(),
                         { linid : mRowGcomfacl.linid }
                    );
                }
            }

            mRsGcomfacl.close();
        }
        
        
            
        /**
         * Retrieve the doclock value after the workflow execution because
         * approvals may change from pending to authorized locks
         * (cworkflow_val_log.log_state from 'P' => 'A') so that
         * the final doclock must be recalculated.
         */
        mObjGcomfach.doclock = this.getDocumentLock();
        mObjGcomfach.valpen  = this.getPendingValidations();

        /**
         * After the workflow, the estcab field must be modified:
         *      E: if doclock contains the value V
         *      V: if doclock does not contain the value V
         */
        mObjGcomfach.estcab = mObjGcomfach.doclock.indexOf('V') != -1 ? 'E' : 'V';

        /**=====================================================================
         * Update gcomfach
         * =====================================================================
         */
        if (mObjGcomfach.hasChanged()) {
             mObjGcomfach.docproc = this.getDocproc();

            mObjGcomfach.date_validate = new Ax.sql.Date();

            //Ax.db.update('gcomfach', mObjGcomfach.getChanged(), `cabid = ${pIntCabid}`);
            Ax.db.update('gcomfach',
                 mObjGcomfach.getChanged(),
                 {cabid : pIntCabid}
            );

        }
        
        

        /**=====================================================================
         * Actions after validation
         * =====================================================================
         */
        this.validate_post(mObjGcomfach, mObjCalcData);
        //console.log(this.log_gcomfach);
    }
}

exports.gcomfach_workflow = gcomfach_workflow;