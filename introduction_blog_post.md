I want to talk a little bit about my ideas behind this tool. The reason I wanted to create it is that I find it really interesting and compelling when a complex situation can be described with data in such a way that it increases people's understanding of that situation.

In this particular example I very commonly see posts on Reddit saying, "How did I lose this game?" and not understanding what the dynamics were that led to their loss. Today I'm going to propose a framework. That framework is: "Age of Empires 4 is a game about gathering and deploying resources." This is not entirely new ground. The military technology and economic triangle of investment is pretty well known in RTS. Essentially you're investing in one of these three, and the question is how those investments compound and you apply them to the game. This framework uses the Military/Tech/Economy triangle with a few other categories as well to encompass how resources ultimately end up being deployed throughout a game.

My goal with this is that if someone asks the question, "What is the reason I won or lost the game?" and they paste in the AoE4World URL, they can look at this output and have more of an understanding of what decisions were made between the two different players in the game and how they led to the point where one player had a distinct and ultimately decisive advantage. In a perfect world, the next time a thread like that gets posted, someone will link a URL from this tool.

First - a quick summary of the features:
The first section is charts and summary bands that represent net deployed resources into primary priorities: economic, technology, and military. By "net deployed resources," I mean the value currently committed to a category, minus the value the opponent has destroyed. This is a model of the game state, not perfect replay truth, but it gives a useful way to compare how each player's resources were being converted over time.

Below those are several others:
- Destroyed: which represents the destroyed value
- Overall: which is just the sum of economic, technology, military, and other
- Float: which is resources that haven't been deployed
- Opportunity lost: which means resources that could've been generated but were not because of either the value of the production or the values that were killed

Within the chart itself, there are events that are tagged, which are significant raids or fights that happened and where significant resources were destroyed by one player or the other. It shows a summary of what the armies were like before the encounter happened and what the effect was on each player. With that, let's move to an actual example.

I'm going to use an example here, which is a game that Beasty played against Core and lost recently: https://aoe4world.com/players/8139502-Beasty/games/229727104?sig=b6fc4eab80fa84ff983bcb27b4af086a59a09f5d. That game is also on his YouTube, which is really nice, because you can watch alongside viewing the data: https://youtu.be/1WXwG3PiVCA?si=8SiSz48REitV5Htt&t=2580

As you read one of these pages, look at the three bands across the top that show economic, technology, and military deployed resources. These just show which player has the lead in terms of overall deployed resources in these three categories. These are essentially a different, simplified view of the charts that you find below. To clarify, they represent net deployed resources by default, which is total deployed resources in the category minus the amount that is destroyed by your opponent.

Using this game as an example, the first thing (which is common in a Sengoku game) is that you see a later age up from the Sengoku player and you see higher economic investment from them in dark age. In this particular game you actually see higher net economic deployed resources throughout the entire game from the Sengoku player, with a slight break around 8 minutes in. Overall, the Sengoku player has a more significant economic deployed resources throughout the entire game. In contrast, the Macedonian player, with the exception of a couple of minutes around 8 to 10 minutes, had more military resources deployed the entire game.

Here, I'd like to draw your attention to the event widgets. These widgets show significant engagements within the game. It shows you what the military was at the time the encounter happened, and what the result was. There are six of them in this particular game, and they're overlaid on the main charts. Let's click on the first one at 8:15. In this particular one, if you watch the video, you'll see Core dives with seven units as Beasty ages up, and he gets nothing for it.

You can see that there is a Yatai that gets destroyed during the same time window, but that's it. There is nothing else. Beasty doesn't take any other damage. Something you'll see here is that this is a significant loss for Core - the tool notes he lost almost 25% of his deployed resource value, and caused no damage. Discerning viewers will notice that Sengoku did have significant idle time, in the video; that's true. The tool doesn't yet handle that.

Moving on to the next fight now at 12:18, which is almost the reverse of the previous one.
When you look at the pre-encounter armies, you see:
- The Macedonian team has 6 Riddari with 3 Crossbows.
- The Sengoku Army has 4 Mounted Samurai, and 3 Ikko-ikki monks, which are counted here as military because they are able to deal damage but are really here for economic reasons.

If you look at the losses, you will see this is a significant loss for Sengoku, which lost almost 10% of the deployed resources, and the Macedonian lost nothing except for a scout.

If you scroll down further you'll see the economic allocations (or the overall allocations). Sengoku has a 300-400 delta on economic investment, and Macedonia has a 300 delta on military investment. Another thing I want to point out is that if you scroll down to the bottom and click on "Opportunity Lost," it shows that Macedonian lost a villager around the 10 minute mark; by now, around 12 minutes, that ends up being around 90 resources lost. However, the same widget shows that Sengoku has lost 260 resources due to villager under-production throughout the course of the game, compared to 197 for the Macedonian, which makes the gap roughly equal. While it's not reflected as much in this game, in other games with early villagers losses, this shows how critical villager losses are & how they compound.

Even further on there are two more engagements, both of which are small but meaningful positive engagements for the Sengoku player, despite having less total active military value. As the tooltip in the tool notes:

> That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where Sengoku Daimyo found an advantage, healing, stronger micro, or a favorable unit matchup.

After the fight at 19:51, however, it's very interesting to watch the lines and see what happens before the next two charts. At 19:51 the two scenarios are almost identical: almost identical economic net investment; almost identical military investment, Macedonian having the edge in technology. However over the course of the next several minutes you'll see diverging investments and you'll see that reflected in the next fight. In the next fight at 23 minutes, we'll see the Sengoku player now have almost 3,000 more invested in the economy.  The Macedonian player has almost 5,000 more invested in military, as well as ~3000 more invested in technology. That results in two disastrous fights, and the end of the game.

Note: While it wouldn't have mattered in this game - it's also interesting to see that this is an investment in farms - and the tool shows this as resource infrastructure, not resource generation - because this investment doesn't increase resource generation, it's just infrastructure to maintain the economy over time. It is also worth noting that the Sengoku player has significant float throughout this game, especially leading up to the final fights, they were floating significant gold & stone.

What this doesn't know yet:
* It does not see exact map position, so it cannot always know whether a fight happened under defensive fire, in a choke, or in another important terrain context.
* It does not fully understand micro, target firing, pathing, formation quality, or moment-to-moment control.
* It does not yet fully model idle villagers or idle production, even when those are visible in a replay.
* Some civilizations have unusual mechanics that need special handling. Delhi is the clearest example right now because of how its technology research works.
* It is best today for typical 10- to 30-minute 1v1 games where investments, fights, float, and losses create a visible game-state divergence.
* It is also better on desktop. I made an effort to make the report work on mobile, but this is a data-heavy tool, and the desktop experience is still much better.

Closing notes:
* I want to make a point that the AoE4World API is being heavily used here. I love that tool and that website. I want to give proper credit and thanks to them for creating this API so that a tool like this can be created and used. I think it's complementary to that site, not a replacement for it.
* I want to stress that I built this tool because I play this game a lot and enjoy it. I have a tech background and a data background, and I always felt like the data was there to better explain what's happening in AOE 4 games. I wanted to build that.
* I would really love feedback on this, especially in two areas. First, I expect there are small but significant modeling issues I have not caught yet, especially around civilization-specific mechanics. If you try a game and something looks wrong, I want to know. Second, I would love feature requests. If there is a chart, explanation, interaction, or kind of game question this should answer, please suggest it. I think it'd be really fun if people used it, reported problems, suggested things to me, and were able to add to it. This could become a really great tool that people can use to figure out what happened when they lost the game, and ideally then they'd be able to respond and improve.
* This tool is not perfect. AoE4 is a complicated game. If you try the tool with Delhi, you're going to find that it doesn't work because I haven't really figured out how to make Delhi work because of the mechanics and technology research Delhi has. There are probably other civilizations I haven't even realized don't work well. There are probably certain types of things this doesn't handle well. I doubt it works that well for really long games. It's best today for a typical 10- to 30-minute game, where there's a series of investments, and those result in a win or a loss.

Things I am currently planning on looking into, pending (hopefully) feedback:
1) Adding "adjusted" military value, accounting for military upgrades & the counter system
2) Modeling win probability, which would also facilitate identifying inflection points in the game
3) Edge-case handling - things like Delhi, Jeanne D'Arc, etc.
