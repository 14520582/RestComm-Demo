class SIPTransactionStack {
    classname="SIPTransactionStack"; 
    messageProcessors=new Array();
    sipMessageFactory=null;
    activeClientTransactionCount = 0;
    mergeTable=new Array();
    defaultRouter=null;
    needsLogging=null;
    stackName=null;
    router=null;
    maxConnections=-1;
    useRouterForAll=null;
    readTimeout= -1;
    outboundProxy=null;
    routerPath=null;
    isAutomaticDialogSupportEnabled: boolean;
    forkedEvents=new Array();
    generateTimeStampHeader=null;
    cancelClientTransactionChecked = true;
    remoteTagReassignmentAllowed = true;
    logStackTraceOnMessageSend = true;
    stackDoesCongestionControl = true;
    checkBranchId: boolean=false;
    isAutomaticDialogErrorHandlingEnabled: boolean = true;
    isDialogTerminatedEventDeliveredForNullDialog: boolean = false;
    serverTransactionTable=new Array();
    clientTransactionTable=new Array();
    terminatedServerTransactionsPendingAck=new Array();
    forkedClientTransactionTable=new Array();
    dialogTable=new Array();
    earlyDialogTable=new Array();
    pendingTransactions=new Array();
    unlimitedServerTransactionTableSize = true;
    unlimitedClientTransactionTableSize = true;
    serverTransactionTableHighwaterMark = 5000;
    serverTransactionTableLowaterMark = 4000;
    clientTransactionTableHiwaterMark = 1000;
    clientTransactionTableLowaterMark = 800;
    rfc2543Supported=true;
    maxForkTime=0;
    toExit=false;
    isBackToBackUserAgent: boolean = false;
    maxListenerResponseTime=-1;
    non2XXAckPassedToListener=null;
    maxMessageSize=null;
    addressResolver = new DefaultAddressResolver();
    stackAddress =null;
    
    public static BASE_TIMER_INTERVAL=500;
    public static CONNECTION_LINGER_TIME=8;
    public static BRANCH_MAGIC_COOKIE_LOWER_CASE="z9hg4bk";
    public static TRYING=100;
    public static RINGING=180;

    public static dialogCreatingMethods= new Array("REFER", "INVITE", "SUBSCRIBE", "REGISTER");
    
    constructor(){

    }

    

    reInit(){
        this.messageProcessors = new Array();
        this.pendingTransactions = new Array();
        this.clientTransactionTable = new Array();
        this.serverTransactionTable = new Array();
        this.mergeTable = new Array();
        this.dialogTable = new Array();
        this.earlyDialogTable = new Array();
        this.terminatedServerTransactionsPendingAck = new Array();
        this.forkedClientTransactionTable = new Array();
        this.activeClientTransactionCount=0;
    }

    addExtensionMethod(extensionMethod){
        if (extensionMethod!="NOTIFY") {
            var l=null;
            for(var i=0;i < SIPTransactionStack.dialogCreatingMethods.length;i++)
            {
                if(SIPTransactionStack.dialogCreatingMethods[i]==extensionMethod.trim().toUpperCase())
                {
                    l=i;
                }
            }
            if(l==null)
            {
                SIPTransactionStack.dialogCreatingMethods.push(extensionMethod.trim().toUpperCase());
            }
        }
    }

    removeDialog(dialog){
        console.log("removeDialog(): id="+dialog.getDialogId())
        var id = dialog.getDialogId();
        var earlyId = dialog.getEarlyDialogId();
        if (earlyId != null) {
            var l=null;
            for(var i=0;i<this.earlyDialogTable.length;i++)
            {
                if(this.earlyDialogTable[i][0]==earlyId)
                {
                    l=i;
                }
            }
            this.earlyDialogTable.splice(l,1);
            // https://bitbucket.org/telestax/telscale-rtm/issue/35/ivnite-dialog-state-machine-is-broken-when
        // When INVITE is sent out and 407 is received, a new challenge INVITE is sent but the Dialog gets TERMINATED from 407 
        // after linger time so 8s, so when the callee try to send BYE it gets a 481 Dialog not found
            // l was not nullified thus a random dialog could have been removed from the dialogTable which corresponds to the new INVITE Dialog
            var l=null;
            for(i=0;i<this.dialogTable.length;i++)
            {
                if(this.dialogTable[i][0]==earlyId)
                {
                    l=i;
                }
            }
            if(l!=null)
            {
                this.dialogTable.splice(l,1);
            } 
        }
        if (id != null) {
            var old = null;
            for(i=0;i<this.dialogTable.length;i++)
            {
                if(this.dialogTable[i][0]==id)
                {
                    old = this.dialogTable[i][1];
                }
            }
            if (old == dialog) {
                var l=null;
                for(i=0;i<this.dialogTable.length;i++)
                {
                    if(this.dialogTable[i][0]==id)
                    {
                        l=i;
                    }
                }
                if(l!=null)
                {
                    this.dialogTable.splice(l,1);
                } 
            }
            if (!dialog.testAndSetIsDialogTerminatedEventDelivered()) {
                var event = new DialogTerminatedEvent(dialog.getSipProvider(),dialog);
                dialog.getSipProvider().handleEvent(event, null);
            }
        }
    }

    findSubscribeTransaction(notifyMessage,listeningPoint){
        var retval = null;
        var thisToTag = notifyMessage.getTo().getTag();
        if (thisToTag == null) {
            return retval;
        }
        var eventHdr = notifyMessage.getHeader("Event");
        if (eventHdr == null) {
            return retval;
        }
        for(var i=0;i<this.clientTransactionTable.length;i++)
        {
            var ct = this.clientTransactionTable[i][1];
            if (ct.getMethod()!="SUBSCRIBE") {
                continue;
            }
            var fromTag = ct.from.getTag();
            var hisEvent = ct.event;
            if (hisEvent == null) {
                continue;
            }
            if (fromTag.toLowerCase()==thisToTag.toLowerCase()
                && hisEvent != null
                && eventHdr.match(hisEvent)
                && notifyMessage.getCallId().getCallId().toLowerCase()==ct.callId.getCallId().toLowerCase()) {
                retval = ct;
                return retval;
            }
        }
        return retval;
    }

    removeTransactionPendingAck(serverTransaction){
        var branchId = serverTransaction.getRequest().getTopmostVia().getBranch();
        var l=null;
        for(var i=0;i<this.terminatedServerTransactionsPendingAck.length;i++)
        {
            if(this.terminatedServerTransactionsPendingAck[i][0]==branchId)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            var r=true;
        }
        else
        {
            r=false;
        }
        if (branchId != null && r) {
            l=null;
            for(i=0;i<this.terminatedServerTransactionsPendingAck.length;i++)
            {
                if(this.terminatedServerTransactionsPendingAck[i][0]==branchId)
                {
                    l=i;
                }
            }
            if(l!=null)
            {
                this.terminatedServerTransactionsPendingAck.splice(l,1);
            }
            return true;
        } else {
            return false;
        }

    }

    removeTransactionHash(sipTransaction){
        var sipRequest = sipTransaction.getOriginalRequest();
        if (sipRequest == null) {
            return;
        }
        if (sipTransaction instanceof SIPClientTransaction) {
            var key = sipTransaction.getTransactionId();
            var l=null;
            for(var i=0;i<this.clientTransactionTable.length;i++)
            {
                if(this.clientTransactionTable[i][0]==key)
                {
                    l=i;
                }
            }
            this.clientTransactionTable.splice(l,1);
        } 
        else if (sipTransaction instanceof SIPServerTransaction) {
            key = sipTransaction.getTransactionId();
            l=null;
            for(i=0;i<this.serverTransactionTable.length;i++)
            {
                if(this.serverTransactionTable[i][0]==key)
                {
                    l=i;
                }
            }
            this.serverTransactionTable.splice(l,1);
        }
    }

    removePendingTransaction(tr){
        var l=null;
        for(var i=0;i<this.pendingTransactions.length;i++)
        {
            if(this.pendingTransactions[i][0]==tr.getTransactionId())
            {
                l=i;
            }
        }
        if(l!=null)
        {
            this.pendingTransactions.splice(l,1);
        }
    }

    isAlive(){
        if(!this.toExit)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    findCancelTransaction(cancelRequest,isServer){
        if (isServer) {
            for(var i=0;i<this.serverTransactionTable.length;i++)
            {
                var transaction = this.serverTransactionTable[i][1];
                var sipServerTransaction = transaction;
                if (sipServerTransaction.doesCancelMatchTransaction(cancelRequest)) {
                    return sipServerTransaction;
                }
            }
        } 
        else {
            for(i=0;i<this.clientTransactionTable.length;i++)
            {
                transaction = this.clientTransactionTable[i][1];
                var sipClientTransaction = transaction;
                if (sipClientTransaction.doesCancelMatchTransaction(cancelRequest)) {
                    return sipClientTransaction;
                }
            }
        }
        return null;
    }

    getDialog(dialogId){
        var l=null;
        for(var i=0;i<this.dialogTable.length;i++)
        {
            if(this.dialogTable[i][0]==dialogId)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            var sipDialog = this.dialogTable[l][1];
            return sipDialog;
        }
        else
        {
            return null;
        }
    }

    isDialogCreated(method){
        for(var i=0;i<dialogCreatingMethods.length;i++)
        {
            if(dialogCreatingMethods[i]==method)
            {
                return true
            }
        }
        return false
    }

    isRfc2543Supported(){
        return this.rfc2543Supported;
    }

    createDialog(){
        if(arguments.length==1)
        {
            var transaction=arguments[0];
            return this.createDialogargu1(transaction);
        }
        else if(arguments.length==2)
        {
            if(arguments[0].classname=="SipProviderImpl")
            {
                var sipProvider=arguments[0];
                sipResponse=arguments[1];
                return new SIPDialog(sipProvider,sipResponse); 
            }
            else
            {
                transaction=arguments[0];
                var sipResponse=arguments[1];
                return this.createDialogargu2(transaction, sipResponse);
            }
        }
    }

    createDialogargu1(transaction){
        var retval = null;
        if (transaction instanceof SIPClientTransaction) {
            var dialogId = transaction.getRequest().getDialogId(false);
            var l=null;
            for(var i=0;i<this.earlyDialogTable.length;i++)
            {
                if(this.earlyDialogTable[i][0]==dialogId)
                {
                    l=i;
                }
            }
            if (l != null) {
                var dialog = this.earlyDialogTable[l][1];
                if (dialog.getState() == null || dialog.getState() == "EARLY") {
                    retval = dialog;
                } 
                else {
                    retval = new SIPDialog(transaction);
                    this.earlyDialogTable[l][1]=retval;
                }
            } 
            else 
            {
                retval = new SIPDialog(transaction);
                var array=new Array();
                array[0]=dialogId;
                array[1]=retval;
                this.earlyDialogTable.push(array);
            }
        } 
        else {
            retval = new SIPDialog(transaction);
        }
        return retval;
    }

    createDialogargu2(transaction,sipResponse){
        var dialogId = transaction.getRequest().getDialogId(false);
        var retval = null;
        var l=null;
        for(var i=0;i<this.earlyDialogTable.length;i++)
        {
            if(this.earlyDialogTable[i][0]==dialogId)
            {
                l=i;
            }
        }
        if (l != null) {
            retval = this.earlyDialogTable[l][1];
            if (sipResponse.isFinalResponse()) {
                this.earlyDialogTable.splice(l,1);
            }
        } 
        else {
            retval = new SIPDialog(transaction, sipResponse);
        }
        return retval;
    }

    createRawMessageChannel(){
        var newChannel = null;
        //var l=null;
        for(var i=0;i<this.messageProcessors.length;i++)
        {
            var processor = this.messageProcessors[i];
            if (processor.getTransport()==this.transport) {
                newChannel = processor.createMessageChannel();
                break;
            }
        }
        return newChannel;
    }

    isNon2XXAckPassedToListener(){
        if(this.non2XXAckPassedToListener)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    isTransactionPendingAck(serverTransaction){
        var branchId = serverTransaction.getRequest().getTopmostVia().getBranch();
        var l=null;
        for(var i=0;i<this.terminatedServerTransactionsPendingAck.length;i++)
        {
            if(this.terminatedServerTransactionsPendingAck[i][0]==branchId)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    setNon2XXAckPassedToListener(passToListener){
        this.non2XXAckPassedToListener = passToListener;
    }

    addForkedClientTransaction(clientTransaction){
        var l=null;
        for(var i=0;i<this.forkedClientTransactionTable.length;i++)
        {
            if(this.forkedClientTransactionTable[i][0]==clientTransaction.getTransactionId())
            {
                l=i;
                this.forkedClientTransactionTable[i][1]=clientTransaction;
            }
        }
        if(l==null)
        {
            var array=new Array();
            array[0]=clientTransaction.getTransactionId();
            array[1]=clientTransaction;
            this.forkedClientTransactionTable.push(array);
        }
    }

    getForkedTransaction(transactionId){
        var l=null;
        for(var i=0;i<this.forkedClientTransactionTable.length;i++)
        {
            if(this.forkedClientTransactionTable[i][0]==transactionId)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            return this.forkedClientTransactionTable[l][1];
        }
        else
        {
            return null;
        }
    }

    addTransactionPendingAck(serverTransaction){
        var branchId = serverTransaction.getRequest().getTopmostVia().getBranch();
        if (branchId != null) {
            var l=null;
            for(var i=0;i<this.terminatedServerTransactionsPendingAck.length;i++)
            {
                if(this.forkedClientTransactionTable[i][0]==branchId)
                {
                    l=i;
                    this.forkedClientTransactionTable[i][1]=serverTransaction;
                }
            }
            if(l==null)
            {
                var array=new Array();
                array[0]=branchId;
                array[1]=serverTransaction;
                this.forkedClientTransactionTable.push(array);
            }
        }
    }

    findTransactionPendingAck(ackMessage){
        var l=null;
        for(var i=0;i<this.terminatedServerTransactionsPendingAck.length;i++)
        {
            if(this.terminatedServerTransactionsPendingAck[i][0]==ackMessage.getTopmostVia().getBranch())
            {
                l=i;
            }
        }
        if(l==null)
        {
            return null;
        }
        else
        {
            return this.terminatedServerTransactionsPendingAck[l][1];
        }
    }

    putDialog(dialog){
        var dialogId = dialog.getDialogId();
        var l=null;
        for(var i=0;i<this.dialogTable.length;i++)
        {
            if(this.dialogTable[i][0]==dialogId)
            {
                l=i;
            }
        }
        if (l!=null) {
            return;
        }
        dialog.setStack(this);
        var array=new Array()
        array[0]=dialogId;
        array[1]=dialog;
        this.dialogTable.push(array);
    }

    findPendingTransaction(requestReceived){
        var l=null;
        for(var i=0;i<this.pendingTransactions.length;i++)
        {
            if(this.dialogTable[i][0]==requestReceived.getTransactionId())
            {
                l=i;
            }
        }
        if(l==null)
        {
            return null;
        }
        else
        {
            return this.pendingTransactions[l][1];
        }
    }

    putPendingTransaction(tr){
        var l=null;
        for(var i=0;i<this.pendingTransactions.length;i++)
        {
            if(this.pendingTransactions[i][0]==tr.getTransactionId())
            {
                l=i;
                this.pendingTransactions[i][1]=tr;
            }
        }
        if(l==null)
        {
            var array=new Array();
            array[0]=tr.getTransactionId();
            array[1]=tr;
            this.pendingTransactions.push(array);
        }
    }

    removePendingTransaction(tr){
        var l=null;
        for(var i=0;i<this.pendingTransactions.length;i++)
        {
            if(this.pendingTransactions[i][0]==tr.getTransactionId())
            {
                l=i;
            }
        }
        this.pendingTransactions.splice(l,1);
    }

    getServerTransactionTableSize(){
        return this.serverTransactionTable.length;
    }

    getClientTransactionTableSize(){
        return this.clientTransactionTable.length;
    }

    findTransaction(sipMessage,isServer){
        var retval = null;
        if (isServer) {
            var via = sipMessage.getTopmostVia();
            if (via.getBranch() != null) {
                var key = sipMessage.getTransactionId();
                for(var i=0;i<this.serverTransactionTable.length;i++)
                {
                    if(this.serverTransactionTable[i][0]==key)
                    {
                        retval=this.serverTransactionTable[i][1];
                    }
                }
                if (key.substring(0,7).toLowerCase()=="z9hg4bk") {
                    return retval;
                }
            }
            for(i=0;i<this.serverTransactionTable.length;i++)
            {
                var sipServerTransaction = this.serverTransactionTable[i][1];
                if (sipServerTransaction.isMessagePartOfTransaction(sipMessage)) {
                    retval = sipServerTransaction;
                    return retval;
                }
            }
        } else {
            via = sipMessage.getTopmostVia();
            if (via.getBranch() != null) {
                key = sipMessage.getTransactionId();
                for(i=0;i<this.clientTransactionTable.length;i++)
                {
                    if(this.clientTransactionTable[i][0]==key)
                    {
                        retval=this.clientTransactionTable[i][1];
                    }
                }
                if (key.substring(0,7).toLowerCase()=="z9hg4bk") {
                    return retval;
                }
            }
            for(i=0;i<this.serverTransactionTable.length;i++)
            {
                var clientTransaction = this.clientTransactionTable[i][1];
                if (clientTransaction.isMessagePartOfTransaction(sipMessage)) {
                    retval = clientTransaction;
                    return retval;
                }
            }
        }
        return retval;
    }

    removeFromMergeTable(tr){
        var key = tr.getRequest().getMergeId();
        var l=null
        if (key != null) {
            for(var i=0;i<this.mergeTable.length;i++)
            {
                if(this.mergeTable[i][0]==key)
                {
                    l=i;
                }
            }
            if(l!=null)
            {
                this.mergeTable.splice(l,1);
            }
        }   
    }

    putInMergeTable(sipTransaction,sipRequest){
        var mergeKey = sipRequest.getMergeId();
        var l=null;
        if (mergeKey != null) {
            for(var i=0;i<this.mergeTable.length;i++)
            {
                if(this.mergeTable[i][0]==mergeKey)
                {
                    this.mergeTable[i][1]=sipTransaction;
                    l=i
                }
            }
            if(l==null)
            {
                var array=new Array()
                array[0]=mergeKey;
                array[1]=sipTransaction;
                this.mergeTable.push(array);
            }
        }
    }

    addTransactionHash(sipTransaction){
        var sipRequest = sipTransaction.getOriginalRequest();
        if (sipTransaction instanceof SIPClientTransaction) {
            this.activeClientTransactionCount++;
            var l=null;
            var key = sipRequest.getTransactionId();
            for(var i=0;i<this.clientTransactionTable.length;i++)
            {
                if(this.clientTransactionTable[i][0]==key)
                {
                    l=i;
                    this.clientTransactionTable[i][1]=sipTransaction;
                }
            }
            if(l==null)
            {
                var array=new Array();
                array[0]=key;
                array[1]=sipTransaction;
                this.clientTransactionTable.push(array);
            }
        } else {
            l=null;
            key = sipRequest.getTransactionId();
            for(i=0;i<this.serverTransactionTable.length;i++)
            {
                if(this.serverTransactionTable[i][0]==key)
                {
                    l=i;
                    this.serverTransactionTable[i][1]=sipTransaction;
                }
            }
            if(l==null)
            {
                array=new Array();
                array[0]=key;
                array[1]=sipTransaction;
                this.serverTransactionTable.push(array);
            }
        }
    }

    setMessageFactory(messageFactory){
        this.sipMessageFactory = messageFactory; 
    }

    checkBranchIdFunction(){
        return this.checkBranchId;    
    }
    addMessageProcessor(newMessageProcessor){
        var l=null
        for(var i=0;i<this.messageProcessors.length;i++)
        {
            if(this.messageProcessors[i]==newMessageProcessor)
            {
                l=i;
            }
        }
        if(l==null)
        {
            this.messageProcessors.push(newMessageProcessor);
        }
    }

    findMergedTransaction(sipRequest){
        if (sipRequest.getMethod()!="INVITE") {
            return null;
        }
        var mergeId = sipRequest.getMergeId();
        var mergedTransaction = null;  
        for(var i=0;i<this.mergeTable.length;i++)
        {
            if(this.mergeTable[i][0]==mergeId)
            {
                mergedTransaction = this.mergeTable[i][1];
            }
        }
        if (mergeId == null) {
            return null;
        } 
        else if (mergedTransaction != null && !mergedTransaction.isMessagePartOfTransaction(sipRequest)) {
            return mergedTransaction;
        } 
        else {
            for (i=0;i<this.dialogTable.length;i++) {
                var dialog=this.dialogTable[i][1];
                var sipDialog = dialog;
                if (sipDialog.getFirstTransaction() != null
                    && sipDialog.getFirstTransaction() instanceof SIPServerTransaction) {
                    var serverTransaction = sipDialog.getFirstTransaction();
                    var transactionRequest = sipDialog.getFirstTransaction().getOriginalRequest();
                    if ((!serverTransaction.isMessagePartOfTransaction(sipRequest))
                        && sipRequest.getMergeId()==transactionRequest.getMergeId()) {
                        return sipDialog.getFirstTransaction();
                    }
                }
            }
            return null;
        }
    }

    mapTransaction(transaction){
        if (transaction.isMapped) {
            return;
        }
        this.addTransactionHash(transaction);
        transaction.isMapped = true;      
    }

    createTransaction(request,mc,nextHop){
        var returnChannel=null;
        if (mc == null) {
            return null;
        }
        returnChannel = this.createClientTransaction(request, mc);
        returnChannel.setViaPort(nextHop.getPort());
        returnChannel.setViaHost(nextHop.getHost());
        this.addTransactionHash(returnChannel);
        return returnChannel;       
    }

    createClientTransaction(sipRequest,encapsulatedMessageChannel){
        var ct = new SIPClientTransaction(this, encapsulatedMessageChannel);
        ct.setOriginalRequest(sipRequest);
        return ct;       
    }

    addTransaction(transaction){
        if(transaction instanceof SIPServerTransaction)
        {
            transaction.map();
        }
        this.addTransactionHash(transaction);     
    }

    transactionErrorEvent(transactionErrorEvent){
        var transaction = transactionErrorEvent.getSource();
        if (transactionErrorEvent.getErrorID() == 2) {
            transaction.setState("TERMINATED");
            if (transaction instanceof SIPServerTransaction) {
                transaction.collectionTime = 0;
            }
            transaction.disableTimeoutTimer();
        }       
    }

    dialogErrorEvent(dialogErrorEvent){
        var sipDialog = dialogErrorEvent.getSource();
        if (sipDialog != null) {
            sipDialog.delet();
        }     
    }

    stopStack(){
        this.pendingTransactions=new Array();
        this.toExit = true;
        var processorList = this.getMessageProcessors();
        for (var processorIndex = 0; processorIndex < processorList.length; processorIndex++) {
            this.removeMessageProcessor(processorList[processorIndex]);
            this.clientTransactionTable=new Array();
            this.serverTransactionTable=new Array();
            this.dialogTable=new Array();
        }
    }

    getMaxMessageSize(){
        return this.maxMessageSize;
    }
    getNextHop(sipRequest){
        if (this.useRouterForAll) {
            if (this.router != null) {
                return this.router.getNextHop(sipRequest);
            } 
            else {
                return null;
            }
        } 
        else {
            if (sipRequest.getRequestURI().isSipURI() || sipRequest.getRouteHeaders() != null) {
                return this.defaultRouter.getNextHop(sipRequest);
            } 
            else if (this.router != null) {
                return this.router.getNextHop(sipRequest);
            } 
            else {
                return null;
            }
        }   
    }

    setStackName(stackName){
        this.stackName = stackName;
    }

    setHostAddress(stackAddress){
        if (stackAddress.indexOf(':') != stackAddress.lastIndexOf(':')
            && stackAddress.trim().charAt(0) != '[') {
            this.stackAddress = '[' + stackAddress + ']';
        } else {
            this.stackAddress = stackAddress;
        }
        this.stackInetAddress = stackAddress;   
    }

    getHostAddress(){
        return this.stackAddress;  
    }

    setRouter(router){
        this.router = router;
    }

    getRouter(){
        if(arguments.length==0)
        {
            this.getRouterargu0();
        }
        else
        {
            var request=arguments[0];
            this.getRouterargu1(request);
        }
    }

    getRouterargu0(){
        return this.router;
    }

    getRouterargu1(request){
        if (request.getRequestLine() == null) {
            return this.defaultRouter;
        } 
        else if (this.useRouterForAll) {
            return this.router;
        }
        else {
            if (request.getRequestURI().getScheme()=="sip"
                || request.getRequestURI().getScheme()=="sips") {
                return this.defaultRouter;
            } else {
                if (this.router != null) {
                    return this.router;
                } else {
                    return this.defaultRouter;
                }
            }
        }       
    }

    removeMessageProcessor(oldMessageProcessor){
        var l=null;
        for(var i=0;i<this.messageProcessors.lengt;i++)
        {
            if (this.messageProcessors[i]==oldMessageProcessor) {
                l=i;
            }
        }
        if (l!=null) {
            this.messageProcessors.splice(l,1);
            oldMessageProcessor.stop();
        }
    }

    getMessageProcessors(){
        return this.messageProcessors;
    }
    isEventForked(ename){
        var l=null;
        for(var i=0;i<this.forkedEvents.length;i++)
        {
            if(this.forkedEvents[i]==ename)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    getActiveClientTransactionCount(){
        return this.activeClientTransactionCount;    
    }

    isCancelClientTransactionChecked(){
        return this.cancelClientTransactionChecked; 
    }

    isRemoteTagReassignmentAllowed(){
        return this.remoteTagReassignmentAllowed;
    }

    getDialogs(){
        if(arguments.length==0)
        {
            return this.getDialogsargu0();
        }
        else
        {
            var state=arguments[0];
            return this.getDialogsargu1(state);
        }
    }

    getDialogsargu0(){
        var dialogs = new Array();
        for(var i=0;i<this.dialogTable.length;i++)
        {
            var l=null;
            for(var x=0;x<dialogs.legnth;x++)
            {
                if(dialogs[x]==this.dialogTable[i][1])
                {
                    l=i;
                }
            }
            if(l==null)
            {
                dialogs.push(this.dialogTable[i][1]);
            }
        }
        for(i=0;i<this.earlyDialogTable.length;i++)
        {
            l=null;
            for(x=0;x<dialogs.legnth;x++)
            {
                if(dialogs[x]==this.earlyDialogTable[i][1])
                {
                    l=i;
                }
            }
            if(l==null)
            {
                dialogs.push(this.earlyDialogTable[i][1]);
            }
        }
        return dialogs;
    }

    getDialogsargu1(state){
        var matchingDialogs = new Array();
        if ("EARLY"==state) {
            for(var i=0;i<this.earlyDialogTable.length;i++)
            {
                var l=null;
                for(var x=0;x<matchingDialogs.legnth;x++)
                {
                    if(matchingDialogs[x]==this.earlyDialogTable[i][1])
                    {
                        l=i;
                    }
                }
                if(l==null)
                {
                    matchingDialogs.push(this.earlyDialogTable[i][1]);
                }
            }
        }
        else {
            for(i=0;i<this.dialogTable.length;i++)
            {
                var dialog=this.dialogTable[i][1];
                if (dialog.getState() != null && dialog.getState()==state) {
                    l=null;
                    for(x=0;x<matchingDialogs.legnth;x++)
                    {
                        if(matchingDialogs[x]==dialog)
                        {
                            l=i;
                        }
                    }
                    if(l==null)
                    {
                        matchingDialogs.push(dialog);
                    }
                }
            }
        }
        return matchingDialogs;     
    }

    setDeliverDialogTerminatedEventForNullDialog(){
        this.isDialogTerminatedEventDeliveredForNullDialog = true;    
    }
    getAddressResolver(){
        return this.addressResolver;      
    }
}
/*
 * TeleStax, Open Source Cloud Communications  Copyright 2012. 
 * and individual contributors
 * by the @authors tag. See the copyright.txt in the distribution for a
 * full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

/*
 *  Implementation of the JAIN-SIP DefaultAddressResolver .
 *  @see  gov/nist/javax/sip/DefaultAddressResolver.java 
 *  @author Yuemin Qin (yuemin.qin@orange.com)
 *  @author Laurent STRULLU (laurent.strullu@orange.com)
 *  @version 1.0 
 *   
 */
class DefaultAddressResolver {
    classname="DefaultAddressResolver"
    constructor(){
    }
    resolveAddress(inputAddress) {
        if  (inputAddress.getPort()  != -1)
        {
            return inputAddress;
        }
        else 
        {
            var mp=new MessageProcessor();
            return new HopImpl(inputAddress.getHost(),mp.getDefaultPort(),inputAddress.getTransport());
        }
    }
}
export class SipStackImpl extends SIPTransactionStack{
    classname="SipStackImpl"; 
    stackName=null;
    eventScanner=new EventScanner(this);
    listeningPoints=new Array();
    sipProviders=new Array();
    sipListener=null;
    messageChannel=null;
    userAgentName: string;
    //lastTransaction=null;
    reEntrantListener=true;

    public static MAX_DATAGRAM_SIZE: number = 8 * 1024;
        
    constructor(sipUserAgent){
        super();
        this.isAutomaticDialogSupportEnabled = true;
        this.userAgentName = sipUserAgent;
        this.sipMessageFactory = new NistSipMessageFactoryImpl(this);
        this.defaultRouter = new DefaultRouter(this, this.stackAddress); 
        this.setHostAddress(Utils.prototype.randomString(12)+".invalid"); 
        this.setNon2XXAckPassedToListener(false);
    }

    isAutomaticDialogSupportEnabledFunction(){
        return this.isAutomaticDialogSupportEnabled;
    }

    isAutomaticDialogErrorHandlingEnabledFunction(){
        return this.isAutomaticDialogErrorHandlingEnabled;
    }

    getEventScanner(){
        return this.eventScanner;
    }

    createSipProvider(listeningPoint){
        if (listeningPoint == null) {
            console.error("SipProviderImpl:createSipProvider(): null listeningPoint argument");
            throw "SipProviderImpl:createSipProvider(): null listeningPoint argument";
        }
        
        if (listeningPoint.sipProvider != null) {
            console.error("SipProviderImpl:createSipProvider(): provider already attached!");
            throw "SipProviderImpl:createSipProvider(): provider already attached!";
        }
        
        var sipProvider = new SipProviderImpl(this);
        sipProvider.setListeningPoint(listeningPoint);
        listeningPoint.setSipProvider(sipProvider);
        this.sipProviders.push(sipProvider);
        return sipProvider;
    }

    createListeningPoint(wsUrl){
        if (!this.isAlive()) {
            this.toExit = false;
            this.reInitialize();
        }
        
        var transport;
        if(wsUrl.toLowerCase().indexOf("ws://")==0) transport="WS";
        else if(wsUrl.toLowerCase().indexOf("wss://")==0) transport="WSS";
        else 
        {
        throw "WSMessageChannel:createWebSocket(): bad Websocket Url";
        console.warn("WSMessageChannel:createWebSocket(): bad Websocket Url");
        }
        
        var key = ListeningPointImpl.prototype.makeKey(this.stackAddress, transport);
        for(var i=0;i<this.listeningPoints.length;i++)
        {
            if(this.listeningPoints[i]==key)
            {
                return this.listeningPoints[i][1];
            }
        }
    
        var messageProcessor = new WSMessageProcessor(this, wsUrl);
        this.addMessageProcessor(messageProcessor);
        var listeningPoint=new ListeningPointImpl(this, messageProcessor);
        messageProcessor.setListeningPoint(listeningPoint);
        var array=new Array();
        array[0]=key;
        array[1]=listeningPoint;
        this.listeningPoints.push(array);
        this.messageChannel=messageProcessor.getMessageChannel();
        return listeningPoint;
    }

    reInitialize(){
        this.reInit();
        this.eventScanner = new EventScanner(this);
        this.listeningPoints = new Array();
        this.sipProviders = new Array();
        this.sipListener = null;
    }

    getUserAgent(){
        return this.userAgentName;
    }

    deleteListeningPoint(listeningPoint){
        if (listeningPoint == null) {
            console.error("SipProviderImpl:deleteListeningPoint(): null listeningPoint arg");
            throw "SipProviderImpl:deleteListeningPoint(): null listeningPoint arg";
        }
        this.removeMessageProcessor(listeningPoint.messageProcessor);
        var key = listeningPoint.getKey();
        for(var i=0;i<this.listeningPoints.length;i++)
        {
            if(this.listeningPoints[i][0]==key)
            {
                this.listeningPoints.splice(i,1);
                break;
            }
        }
    }

    deleteSipProvider(sipProvider){
        if (sipProvider == null) {
            console.error("SipProviderImpl:deleteSipProvider(): null provider arg");
            throw "SipProviderImpl:deleteSipProvider(): null provider arg";
        }
        if (sipProvider.getSipListener() != null) {
            console.error("SipProviderImpl:deleteSipProvider(): sipProvider still has an associated SipListener!");
            throw "SipProviderImpl:deleteSipProvider(): sipProvider still has an associated SipListener!";
        }
        sipProvider.removeListeningPoints();
        sipProvider.stop();
        for(var i=0;i<this.sipProviders.length;i++)
        {
            if(this.sipProviders[i]==sipProvider)
            {
                this.sipProviders.splice(i,1);
                break;
            }
        }
        if (this.sipProviders.length==0) {
            this.stopStack();
        }
    }

    getListeningPoints(){
        return this.listeningPoints;
    }

    getSipProviders(){
        return this.sipProviders;
    }

    getStackName(){
        return this.stackName;
    }

    finalize(){
        this.stopStack();
    }

    stop(){
        this.stopStack();
        this.sipProviders = new Array();
        this.listeningPoints = new Array();
        if (this.eventScanner != null) {
            this.eventScanner.forceStop();
        }
        this.eventScanner = null;
    }

    start(){
        if (this.eventScanner == null) {
            this.eventScanner = new EventScanner(this);
        }
    }

    getSipListener(){
        return this.sipListener;
    }

    setEnabledCipherSuites(newCipherSuites){
        this.cipherSuites = newCipherSuites;
    }

    getEnabledCipherSuites(){
        return this.cipherSuites;
    }

    setEnabledProtocols(newProtocols){
        this.enabledProtocols = newProtocols;
    }

    getEnabledProtocols(){
        return this.enabledProtocols;
    }

    setIsBackToBackUserAgent(flag){
        this.isBackToBackUserAgent = flag;
    }

    getIsBackToBackUserAgent() {
        return this.isBackToBackUserAgent;
    }

    getIsAutomaticDialogErrorHandlingEnabled(){
        return this.isAutomaticDialogErrorHandlingEnabled;
    }

    getChannel(){
        return this.messageChannel;
    }

    newSIPServerRequest(requestReceived,requestMessageChannel){
        var nextTransaction=null;
        var currentTransaction=null;
        var key = requestReceived.getTransactionId();
        requestReceived.setMessageChannel(requestMessageChannel); 
        var l=null;
        for(var i=0;i<this.serverTransactionTable.length;i++)
        {
            if(this.serverTransactionTable[i][0]==key)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            currentTransaction=this.serverTransactionTable[l][1]; 
        }
        if (currentTransaction == null|| !currentTransaction.isMessagePartOfTransaction(requestReceived)) {
            currentTransaction = null;
            var length=this.BRANCH_MAGIC_COOKIE_LOWER_CASE.length;
            var chaine=key.toLowerCase().substr(0, length-1);
            if (chaine!=this.BRANCH_MAGIC_COOKIE_LOWER_CASE) {
                for(i=0;(i<this.serverTransactionTable.length) && (currentTransaction == null);i++)
                {
                    nextTransaction=this.serverTransactionTable[i][1];
                    if (nextTransaction.isMessagePartOfTransaction(requestReceived)) {
                        currentTransaction = nextTransaction;
                    }
                }
            }
            if (currentTransaction == null) {
                currentTransaction = this.findPendingTransaction(requestReceived);
                if (currentTransaction != null) {
                    requestReceived.setTransaction(currentTransaction);
                    if (currentTransaction != null) {
                        return currentTransaction;
                    } else {
                        return null;
                    }

                }
                // TODO: when an ACK arrives after INVITE server transaction this leg is visited, which creates a new
                // server transaction for the ACK, but which does nothing, since a bit later (check 'if (requestReceived.getMethod() == "ACK")' leg)
                // we associate the ACK with an existing transaction using different matching. We could consider guarding against ACKs to 2xx in this
                // leg, to avoid this redundancy. Also check https://github.com/RestComm/webrtcomm/issues/82
                currentTransaction = this.createServerTransaction(requestMessageChannel);
                currentTransaction.setOriginalRequest(requestReceived);
                requestReceived.setTransaction(currentTransaction);
                if(requestReceived.getMethod()!="ACK")
                {
                currentTransaction=requestMessageChannel.messageProcessor.listeningPoint.sipProvider.getNewServerTransaction(requestReceived);
                }
            }
        }
        if (currentTransaction != null) {
            currentTransaction.setRequestInterface(this.sipMessageFactory.newSIPServerRequest(
                requestReceived, currentTransaction));
        }
        if (requestReceived.getMethod() == "ACK")
        {
            // ACKs are a special case because ACK to 200 OK has different transaction id, so we need other means to associate the ACK transaction 
            // with the original INVITE server transaction. Let's match based on RFC rules:
            //
            // Quoting SIP RFC: The ACK request matches a transaction if the Request-
            // URI, From tag, Call-ID, CSeq number (not the method), and top Via
            // header field match those of the INVITE request which created the
            // transaction, and the To tag of the ACK matches the To tag of the
            // response sent by the server transaction.  Matching is done based on
            // the matching rules defined for each of those header fields.
            for (i = 0; i < this.serverTransactionTable.length; i++) {
            transaction = this.serverTransactionTable[i][1];
            // important note: we are comparing all the fields as described in the RFC, except for Via where we don't compare the branch (i.e. transactionId), 
            // since it is different in the ACK that comes after 200 OK (remember a new transaction is created for that ACK from the client)

            // also note that for request URI we leave parameters out and compare everything else, as it breaks some scenarios from RC/XMS: webrtcomm #94 
            if (transaction.getOriginalRequest().getRequestURI().getScheme() == requestReceived.getRequestURI().getScheme() &&
                    transaction.getOriginalRequest().getRequestURI().getUser() == requestReceived.getRequestURI().getUser() &&
                    transaction.getOriginalRequest().getRequestURI().getHost() == requestReceived.getRequestURI().getHost() &&
                    transaction.getOriginalRequest().getRequestURI().getPort() == requestReceived.getRequestURI().getPort() &&
                    transaction.getOriginalRequest().getFromTag() == requestReceived.getFromTag() &&
                    transaction.getOriginalRequest().getCallId().getCallId().toString() == requestReceived.getCallId().getCallId().toString() &&
                    transaction.getOriginalRequest().getCSeq().getSeqNumber() == requestReceived.getCSeq().getSeqNumber() &&
                    transaction.getOriginalRequest().getTopmostViaHeader().getSentProtocol().encode() == requestReceived.getTopmostViaHeader().getSentProtocol().encode() &&
                    transaction.getOriginalRequest().getTopmostViaHeader().getSentBy().encode() == requestReceived.getTopmostViaHeader().getSentBy().encode() &&
                    transaction.getLastResponse().getToTag() == requestReceived.getToTag()) {
                currentTransaction = transaction;
            }
            }
        }
        /*
        else
        {
            this.lastTransaction=currentTransaction;
        }
        */
        return currentTransaction;
    }


    newSIPServerResponse(responseReceived,responseMessageChannel){
        var nextTransaction=null;
        var currentTransaction=null;
        var key = responseReceived.getTransactionId();
        var l=null;
        for(var i=0;i<this.clientTransactionTable.length;i++)
        {
            if(this.clientTransactionTable[i][0]==key)
            {
                l=i;
            }
        }
        if(l!=null)
        {
            currentTransaction=this.clientTransactionTable[l][1];
        }
        var length=this.BRANCH_MAGIC_COOKIE_LOWER_CASE.length;
        var chaine=key.toLowerCase().substr(0, length-1);
        if (currentTransaction == null
            || (!currentTransaction.isMessagePartOfTransaction(responseReceived) 
                && chaine!=this.BRANCH_MAGIC_COOKIE_LOWER_CASE)) {
            for(i=0;(i<this.clientTransactionTable.length) && (currentTransaction == null);i++)
            {
                nextTransaction=this.clientTransactionTable[i][1];
                if (nextTransaction.isMessagePartOfTransaction(responseReceived)) {
                    currentTransaction = nextTransaction;
                }
            }
            if (currentTransaction == null) {
                return this.sipMessageFactory.newSIPServerResponse(responseReceived,
                    responseMessageChannel);
            }
        }
        var sri = this.sipMessageFactory.newSIPServerResponse(responseReceived, currentTransaction);
        if (sri != null) {
            currentTransaction.setResponseInterface(sri);
        }
        else {
            return null;
        }
        return currentTransaction;
    }

    createServerTransaction(encapsulatedMessageChannel){
        return new SIPServerTransaction(this, encapsulatedMessageChannel);
    }

    removeTransaction(sipTransaction){
        if (sipTransaction instanceof SIPServerTransaction) {
            var key = sipTransaction.getTransactionId();
            var removed=null;
            var l=null;
            for(var i=0;i<this.serverTransactionTable.length;i++)
            {
                if(key==this.serverTransactionTable[i])
                {
                    l=i
                    removed=this.serverTransactionTable[i][1];
                }
            }
            this.serverTransactionTable.splice(l,1);
            var method = sipTransaction.getMethod();
            this.removePendingTransaction(sipTransaction);
            this.removeTransactionPendingAck(sipTransaction);
            if (method.toUpperCase()=="INVITE") {
                this.removeFromMergeTable(sipTransaction);
            }
            var sipProvider = sipTransaction.getSipProvider();
            if (removed != null && sipTransaction.testAndSetTransactionTerminatedEvent()) {
                var event = new TransactionTerminatedEvent(sipProvider,sipTransaction);
                sipProvider.handleEvent(event, sipTransaction);
            }
        } 
        else {
            key = sipTransaction.getTransactionId();
            var l=null;
            for(var i=0;i<this.clientTransactionTable.length;i++)
            {
                if(this.clientTransactionTable[i][0]==key)
                {
                    l=i;
                }
            }
            if(l!=null)
            {
                removed = this.clientTransactionTable[l][1];
                this.clientTransactionTable.splice(l,1);
            }
            if (removed != null && sipTransaction.testAndSetTransactionTerminatedEvent()) {
                sipProvider = sipTransaction.getSipProvider();
                event = new TransactionTerminatedEvent(sipProvider,sipTransaction);
                sipProvider.handleEvent(event, sipTransaction);
            }
        }
    }
    
}
export class SipFactory{
    classname: string;


    constructor(){
        this.classname="SipFactory"; 
    }


    createSipStack(sipUserAgentName){
        try {
           return new SipStackImpl(sipUserAgentName);
        } catch (exception) {
            console.error("SipFactory:createAddressFactory(): failed to create SipStackImpl");
            throw "SipFactory:createAddressFactory(): failed to create SipStackImpl";
        }
    }
    

    createAddressFactory(){
        try {
            return new AddressFactoryImpl();
        } catch (exception) {
            console.error("SipFactory:createAddressFactory(): failed to create AddressFactory");
            throw "SipFactory:createAddressFactory(): failed to create AddressFactory";
        }
    }
    

    createHeaderFactory(){
        try {
            return new HeaderFactoryImpl();
        } catch (exception) {
            console.error("SipFactory:createHeaderFactory(): failed to create HeaderFactory");
            throw "SipFactory:createHeaderFactory(): failed to create HeaderFactory";
        }
    }


    createMessageFactory(){
        try {
            return new MessageFactoryImpl();
        } catch (exception) {
            console.error("SipFactory:createMessageFactory(): failed to create MessageFactory");
            throw "SipFactory:createMessageFactory():failed to create MessageFactory";
        }
    }
}