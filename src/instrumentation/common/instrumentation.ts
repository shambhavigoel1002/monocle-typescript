import {
    InstrumentationBase,
    InstrumentationNodeModuleDefinition,
} from '@opentelemetry/instrumentation';
import { context } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { NodeTracerProvider, SpanProcessor } from "@opentelemetry/sdk-trace-node";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { combinedPackages } from "./packages";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { getPatchedMain } from "./wrapper";
import { AWS_CONSTANTS } from './constants';
import path from 'path';
import { Hook as ImportHook } from "import-in-the-middle";
import { Hook as RequireHook } from "require-in-the-middle";
import { getMonocleExporters } from '../../exporters';
import { PatchedBatchSpanProcessor } from './opentelemetryUtils';
import {AWSS3SpanExporter} from '../../exporters/aws/AWSS3SpanExporter'
import { consoleLog } from '../../common/logging';

class MonocleInstrumentation extends InstrumentationBase {
    constructor(config = {}) {
        super('MonocleInstrumentation', "1.0", config)
        consoleLog('MonocleInstrumentation initialized with config:', config);
    }

    /**
     * Init method will be called when the plugin is constructed.
     * It returns an `InstrumentationNodeModuleDefinition` which describes
     *   the node module to be instrumented and patched.
     * It may also return a list of `InstrumentationNodeModuleDefinition`s if
     *   the plugin should patch multiple modules or versions.
     */
    init() {
        consoleLog('Initializing MonocleInstrumentation');
        const modules: any[] = []
        // @ts-ignore: custom field access
        const packagesForInstrumentation = combinedPackages.concat(this._config.userWrapperMethods || [])
        packagesForInstrumentation.forEach(element => {
            const module = new InstrumentationNodeModuleDefinition(
                element.package,
                ['*'],
                this._getOnPatchMain({ ...element }).bind(this),
            );
            modules.push(module)
        })
        consoleLog(`Initialized ${modules.length} modules for instrumentation`);
        return modules;
    }

    enable() {
        consoleLog('Enabling MonocleInstrumentation');
        // @ts-ignore: private field access required
        if (this._enabled) {
            return;
        }
        // @ts-ignore: private field access required
        this._enabled = true;
        // already hooked, just call patch again
        // @ts-ignore: private field access required
        if (this._hooks.length > 0) {
            // @ts-ignore: private field access required
            for (const module of this._modules) {
                if (typeof module.patch === 'function' && module.moduleExports) {
                    this._diag.debug('Applying instrumentation patch for nodejs module on instrumentation enabled', {
                        module: module.name,
                        version: module.moduleVersion,
                    });
                    module.patch(module.moduleExports, module.moduleVersion);
                }
                for (const file of module.files) {
                    if (file.moduleExports) {
                        this._diag.debug('Applying instrumentation patch for nodejs module file on instrumentation enabled', {
                            module: module.name,
                            version: module.moduleVersion,
                            fileName: file.name,
                        });
                        file.patch(file.moduleExports, module.moduleVersion);
                    }
                }
            }
            return;
        }
        // @ts-ignore: private field access required
        this._warnOnPreloadedModules();
        // @ts-ignore: private field access required
        for (const module of this._modules) {
            const hookFn = (exports, name, baseDir) => {
                if (!baseDir && path.isAbsolute(name)) {
                    const parsedPath = path.parse(name);
                    name = parsedPath.name;
                    baseDir = parsedPath.dir;
                }
                // @ts-ignore: private field access required
                return this._onRequire(module, exports, name, baseDir);
            };
            const onRequire = (exports, name, baseDir) => {
                // @ts-ignore: private field access required
                return this._onRequire(module, exports, name, baseDir);
            };
            // `RequireInTheMiddleSingleton` does not support absolute paths.
            // For an absolute paths, we must create a separate instance of the
            // require-in-the-middle `Hook`.
            const hook = new RequireHook([module.name], { internals: true }, onRequire);
            // @ts-ignore: private field access required
            this._hooks.push(hook);
            const esmHook = new ImportHook([module.name], { internals: false }, hookFn);
            // @ts-ignore: private field access required
            this._hooks.push(esmHook);
        }
    }

    _getOnPatchMain(element) {
        return (moduleExports) => {
            try {
                this._wrap(
                    moduleExports[element.object].prototype,
                    element.method,
                    this._patchMainMethodName(element)
                );
                return moduleExports;
            } catch (e) {
                consoleLog('Error in _getOnPatchMain', {
                    package: element.package,
                    object: element.object,
                    method: element.method,
                    error: e.message,
                    stack: e.stack
                });
                throw e;
            }
        }
    }

    _patchMainMethodName(element) {
        const tracer = this.tracer
        return getPatchedMain({ tracer, ...element })
    }
}

const setupMonocle = (
    workflowName: string,
    spanProcessors: SpanProcessor[] = [],
    wrapperMethods: any[] = []
) => {
    try {
        consoleLog(`Setting up Monocle for workflow: ${workflowName}`);
        const resource = new Resource({
            SERVICE_NAME: workflowName
        })
        const contextManager = new AsyncHooksContextManager();
        contextManager.enable();
        context.setGlobalContextManager(contextManager);
        const tracerProvider = new NodeTracerProvider({
            resource: resource
        })
        const monocleProcessors: SpanProcessor[] = [];
        if (!spanProcessors.length) {
            addSpanProcessors(monocleProcessors);
        }

        [...spanProcessors, ...monocleProcessors].forEach(processor => {
            consoleLog(`Adding span processor: ${processor.constructor.name}`);
            tracerProvider.addSpanProcessor(processor);
        });
        // for (let processor of spanProcessors)
        //     tracerProvider.addSpanProcessor(processor)
        const userWrapperMethods: any[] = []
        wrapperMethods.forEach((wrapperMethod: any[]) => {
            if (Array.isArray(wrapperMethod)) {
                userWrapperMethods.push(...wrapperMethod)
            }
        })
        const monocleInstrumentation = new MonocleInstrumentation({
            userWrapperMethods
        });

        monocleInstrumentation.setTracerProvider(tracerProvider);

        monocleInstrumentation.enable();

        consoleLog('Monocle setup completed');
        return monocleInstrumentation;
    } catch (e) {
        consoleLog('Error in setupMonocle', {
            workflowName,
            error: e.message,
            stack: e.stack
        });
        throw e;
    }
}

function addSpanProcessors(okahuProcessors: SpanProcessor[] = []) {
    consoleLog('Adding span processors, environment:', {
        MONOCLE_EXPORTER: process.env.MONOCLE_EXPORTER,
        isLambda: Object.prototype.hasOwnProperty.call(process.env, AWS_CONSTANTS.AWS_LAMBDA_FUNCTION_NAME)
    });
    if (!process.env.MONOCLE_EXPORTER && 
        Object.prototype.hasOwnProperty.call(process.env, AWS_CONSTANTS.AWS_LAMBDA_FUNCTION_NAME)) {
        consoleLog(`addSpanProcessors| Using AWS S3 span exporter and Console span exporter`);
        okahuProcessors.push(
            new PatchedBatchSpanProcessor(
                new AWSS3SpanExporter({}),
                {
                    scheduledDelayMillis: 5
                }
            )

        )
        okahuProcessors.push(new PatchedBatchSpanProcessor(
            new ConsoleSpanExporter(),
            {
                scheduledDelayMillis: 5
            }
        ))
    }
    else {
        okahuProcessors.push(
            ...getMonocleExporters().map((exporter) => {
                return new PatchedBatchSpanProcessor(
                    exporter,
                    {
                        scheduledDelayMillis: 5
                    }
                )
            })
        )
    }
}

export { setupMonocle };