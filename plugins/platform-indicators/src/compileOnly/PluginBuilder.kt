package app.valenced.plugins

import app.valenced.xposed.api.HostScope

interface PluginScope : HostScope
class PluginBuilder {
    external fun start(block: PluginScope.() -> Unit)
    external fun stop(block: PluginScope.() -> Unit)
}
external fun plugin(block: PluginBuilder.() -> Unit): PluginBuilder
